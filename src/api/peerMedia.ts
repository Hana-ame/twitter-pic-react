// 26-09-08: PeerJS 媒体加载客户端。参考 peerdrive-media (packages/peerdrive-media/src/core.js)。
// 简化版: 去掉通道池预热、Service Worker 支持, 保留核心链路。
//
// 架构:
//   - 一条 PeerJS 连接 → 多条 DataChannel
//   - 控制通道 (control): keepalive ping/ping-ack
//   - 文件通道 (file-{reqId}): 每个 URL 请求一条独立通道
//   - 帧协议: 文本帧=JSON 控制头, 二进制帧=数据块
//
// 改进 (26-09-08 第二轮):
//   - Blob URL 追踪 + 自动回收 (防内存泄漏)
//   - 指数退避重试 (可靠性)
//   - testConnection 连接测试 (UX)
//   - getConnectionStatus 连接状态 (UX)
//   - disposeAll 全量释放 (页面卸载)
//   - 通道池 (性能: 复用 DataChannel)
//
// 用法:
//   const result = await client.load("https://pbs.twimg.com/media/xxx.jpg", { peer: "node-1" });
//   // result = { blob, blobUrl, mime, size }
//
//   const status = client.getConnectionStatus("node-1");
//   // status = { connected: true, pending: 0, ... }
//
//   const ok = await client.testConnection("node-1");
//   // ok = { success: true, latency: 123 }

import Peer, { DataConnection } from "peerjs";

// ====== 信令默认值 ======
export const DEFAULT_SIGNALING = {
  host: "0.peerjs.com",
  port: 443,
  secure: true,
  key: "peerjs",
  path: "/",
};

type SignalingConfig = {
  host: string;
  port: number;
  secure: boolean;
  key: string;
  path: string;
  config?: any;
};

// ====== 帧协议 (与 peerdrive-media protocol.js 一致) ======

const PROTOCOL_VERSION = 1;
const CHUNK_SIZE = 64 * 1024;

export function makeUrlRequest(url: string, reqId: string): string {
  return JSON.stringify({ type: "url", url, reqId, v: PROTOCOL_VERSION });
}

export function parseFrame(text: string): { type: string; [k: string]: any } | null {
  try {
    const o = JSON.parse(text);
    if (typeof o === "object" && o !== null && typeof o.type === "string") return o;
  } catch { /* 非 JSON */ }
  return null;
}

export function isBinaryFrame(data: unknown): boolean {
  if (typeof data === "string") return false;
  if (data instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(data)) return true;
  if (typeof Blob !== "undefined" && data instanceof Blob) return true;
  return false;
}

export function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new Error("peerMedia: unsupported binary frame type");
}

// MIME 兜底表: Node 端响应缺 Content-Type 时按扩展名猜
const EXT_MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", svg: "image/svg+xml", bmp: "image/bmp",
  mp4: "video/mp4", webm: "video/webm", ogg: "video/ogx", mov: "video/quicktime",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
};

export function guessMime(url: string, contentType?: string): string {
  if (contentType) return contentType;
  try {
    const path = new URL(url).pathname.toLowerCase();
    const ext = path.split(".").pop() || "";
    return EXT_MIME[ext] || "application/octet-stream";
  } catch {
    return "application/octet-stream";
  }
}

// ====== 请求 ID 生成 ======
let _reqCounter = 0;
export function nextReqId(): string {
  return `r${++_reqCounter}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ====== 信令配置缓存键 ======
function signalingKey(sig: SignalingConfig): string {
  return `${sig.host}:${sig.port}:${sig.key}:${sig.path || "/"}`;
}

// ====== Keepalive 参数 ======
const KEEPALIVE_INTERVAL = 5000;  // 每 5s 发 ping
const KEEPALIVE_TIMEOUT = 15000;  // 15s 无帧 → teardown

// ====== 连接槽位 ======
const CHANNEL_POOL_MAX = 3;       // 通道池最大容量
const CHANNEL_POOL_TTL = 30000;   // 空闲通道超时 (ms)

type ChannelPoolEntry = {
  conn: DataConnection;
  releasedAt: number;
};

class ConnectionSlot {
  peerId: string;
  signaling: SignalingConfig;
  peer: Peer | null = null;
  controlConn: DataConnection | null = null;
  ready = false;
  closed = false;
  opening = false;
  pending = new Map<string, PendingEntry>();
  lastActive = 0;
  kaTimer: ReturnType<typeof setInterval> | null = null;
  _waitingForReady: { url: string; resolve: (v: LoadResult) => void; reject: (e: Error) => void; signal?: AbortSignal; onProgress?: (got: number, total: number, percent: number) => void }[] | null = null;

  // 通道池: 复用已关闭请求的文件通道
  private _channelPool: ChannelPoolEntry[] = [];
  private _poolTimer: ReturnType<typeof setInterval> | null = null;

  // 26-09-08: 连接状态统计
  totalRequests = 0;
  successRequests = 0;
  failedRequests = 0;
  lastError: string | null = null;

  constructor(peerId: string, signaling: SignalingConfig) {
    this.peerId = peerId;
    this.signaling = signaling;
    this.startPoolCleanup();
  }

  // ====== 通道池 ======
  private startPoolCleanup(): void {
    this._poolTimer = setInterval(() => {
      const now = Date.now();
      this._channelPool = this._channelPool.filter((e) => {
        if (now - e.releasedAt > CHANNEL_POOL_TTL) {
          try { e.conn.close(); } catch { /* 幂等 */ }
          return false;
        }
        return true;
      });
    }, 10000);
  }

  private acquireChannel(): DataConnection {
    // 从池中取一个空闲通道
    const entry = this._channelPool.pop();
    if (entry && entry.conn.open) return entry.conn;
    // 池中无可用, 创建新通道
    return this.peer!.connect(this.peerId, {
      reliable: true,
      serialization: "raw",
      label: `file-${nextReqId()}`,
    });
  }

  private releaseChannel(conn: DataConnection): void {
    if (!conn.open) return;
    if (this._channelPool.length < CHANNEL_POOL_MAX) {
      this._channelPool.push({ conn, releasedAt: Date.now() });
    } else {
      try { conn.close(); } catch { /* 幂等 */ }
    }
  }

  private clearChannelPool(): void {
    for (const e of this._channelPool) {
      try { e.conn.close(); } catch { /* 幂等 */ }
    }
    this._channelPool = [];
  }

  // request: 在连接上发起一次加载
  // 26-09-08: request 支持 onProgress 回调
  request(url: string, resolve: (v: LoadResult) => void, reject: (e: Error) => void, signal?: AbortSignal, onProgress?: (got: number, total: number, percent: number) => void): void {
    if (this.closed) {
      reject(new Error("peerMedia: connection closed"));
      return;
    }
    if (!this.ready) {
      if (!this.opening) {
        this.opening = true;
        this.open();
      }
      // 排队等待连接就绪
      this._waitingForReady = this._waitingForReady || [];
      const entry = { url, resolve, reject, signal, onProgress };
      this._waitingForReady.push(entry);
      // 排队中 abort: 立即从等待列表移除并 reject
      if (signal) {
        if (signal.aborted) {
          const idx = this._waitingForReady.findIndex((e) => e === entry);
          if (idx >= 0) this._waitingForReady.splice(idx, 1);
          reject(new DOMException("aborted", "AbortError"));
          return;
        }
        const onAbort = () => {
          if (this._waitingForReady) {
            const idx = this._waitingForReady.findIndex((e) => e === entry);
            if (idx >= 0) this._waitingForReady.splice(idx, 1);
          }
          signal?.removeEventListener("abort", onAbort);
        };
        signal.addEventListener("abort", onAbort);
      }
      return;
    }
    this.sendFileRequest(url, resolve, reject, signal, onProgress);
  }

  // sendFileRequest: 创建文件 DataChannel 并发送请求 (使用通道池复用)
  // 26-09-08: 支持 onProgress 回调
  sendFileRequest(url: string, resolve: (v: LoadResult) => void, reject: (e: Error) => void, signal?: AbortSignal, onProgress?: (got: number, total: number, percent: number) => void): void {
    const reqId = nextReqId();
    this.totalRequests++;

    // 从通道池获取或创建新通道
    const conn = this.acquireChannel();

    const rec: PendingEntry = {
      resolve, reject,
      chunks: [],
      mime: null,
      size: 0,
      got: 0,
      conn,
      listeners: {},
      onProgress,
      _lastProgressPct: 0,
      _progressStart: Date.now(),
      cleanup: () => {
        // 移除监听器
        if (rec.listeners.data) conn.removeListener("data", rec.listeners.data);
        if (rec.listeners.close) conn.removeListener("close", rec.listeners.close);
        if (rec.listeners.error) conn.removeListener("error", rec.listeners.error);
        if (rec.listeners.open) conn.removeListener("open", rec.listeners.open);
        // 26-09-08: 归还通道到池 (如果还没关闭)
        this.releaseChannel(conn);
      },
    };

    if (signal) {
      if (signal.aborted) {
        rec.cleanup();
        reject(new DOMException("aborted", "AbortError"));
        return;
      }
      const onAbort = () => {
        this.pending.delete(reqId);
        rec.cleanup();
        reject(new DOMException("aborted", "AbortError"));
        signal.removeEventListener("abort", onAbort);
      };
      signal.addEventListener("abort", onAbort);
    }

    this.pending.set(reqId, rec);

    const onOpen = () => {
      try {
        conn.send(makeUrlRequest(url, reqId));
      } catch (err) {
        this.pending.delete(reqId);
        rec.cleanup();
        reject(err as Error);
      }
    };
    conn.on("open", onOpen);
    rec.listeners.open = onOpen;

    const onData = (data: unknown) => this.handleFileData(reqId, data);
    conn.on("data", onData);
    rec.listeners.data = onData;

    const onClose = () => {
      const p = this.pending.get(reqId);
      if (p) {
        this.pending.delete(reqId);
        p.cleanup();
        p.reject(new Error("peerMedia: file channel closed"));
      }
    };
    conn.on("close", onClose);
    rec.listeners.close = onClose;

    const onError = (err: unknown) => {
      const p = this.pending.get(reqId);
      if (p) {
        this.pending.delete(reqId);
        p.cleanup();
        p.reject(new Error(`peerMedia: file channel error: ${JSON.stringify(err)}`));
      }
    };
    conn.on("error", onError);
    rec.listeners.error = onError;
  }

  // open: 建立到 Node 端 peer 的完整链路
  open(): void {
    const sig = this.signaling;
    const peer = new Peer(
      `tpr-b-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
      {
        host: sig.host, port: sig.port, secure: sig.secure, key: sig.key, path: sig.path,
        config: sig.config || { iceServers: [] },
      }
    );
    this.peer = peer;

    const timeout = setTimeout(() => {
      if (!this.ready && !this.closed) this.failAll("peerjs signaling timeout");
    }, 15000);

    peer.on("error", (err: any) => {
      clearTimeout(timeout);
      if (!this.ready && !this.closed) this.failAll(`peerjs error: ${err?.type || err}`);
    });

    peer.on("open", () => {
      const conn = peer.connect(this.peerId, {
        reliable: true,
        serialization: "raw",
        label: "control",
      });
      this.controlConn = conn;

      conn.on("open", () => {
        clearTimeout(timeout);
        this.opening = false;
        this.ready = true;
        this.startKeepalive();
        // 处理排队等待的连接就绪请求
        if (this._waitingForReady && this._waitingForReady.length) {
          const entries = this._waitingForReady;
          this._waitingForReady = null;
          for (const entry of entries) {
            if (entry.signal) {
              entry.signal.removeEventListener("abort", () => {});
            }
            this.sendFileRequest(entry.url, entry.resolve, entry.reject, entry.signal);
          }
        }
      });

      conn.on("data", (data: unknown) => this.handleControlData(data));
      conn.on("close", () => this.teardown("control channel closed"));
      conn.on("error", (err: any) => {
        if (!this.ready && !this.closed) this.failAll(`control channel error: ${err?.type || err}`);
      });
    });
  }

  // handleControlData: 处理控制通道数据 (只接收 ping-ack)
  handleControlData(data: unknown): void {
    this.lastActive = Date.now();
    if (typeof data === "string") {
      const msg = parseFrame(data);
      if (msg?.type === "ping-ack") return;
    }
  }

  // handleFileData: 处理文件通道数据
  handleFileData(reqId: string, data: unknown): void {
    this.lastActive = Date.now();
    const p = this.pending.get(reqId);
    if (!p) return;

    if (isBinaryFrame(data)) {
      const bytes = toUint8Array(data);
      p.chunks.push(bytes);
      p.got += bytes.length;
      // 26-09-08: 报告进度 (节流: 每 5% 或至少一次)
      if (p.onProgress && p.size > 0) {
        const pct = Math.min(100, Math.floor((p.got / p.size) * 100));
        if (pct - p._lastProgressPct >= 5 || pct === 100) {
          p._lastProgressPct = pct;
          p.onProgress(p.got, p.size, pct);
        }
      }
      return;
    }

    const msg = parseFrame(data as string);
    if (!msg) return;

    switch (msg.type) {
      case "meta":
        p.mime = msg.mime || guessMime(msg.url || "", msg.contentType);
        p.size = msg.size || 0;
        if (msg.status >= 400) {
          this.pending.delete(reqId);
          this.failedRequests++;
          this.lastError = `upstream ${msg.status}`;
          p.cleanup();
          p.reject(new Error(`peerMedia: upstream ${msg.status}`));
        }
        break;
      case "done":
        this.pending.delete(reqId);
        this.successRequests++;
        const blob = new Blob(p.chunks, { type: p.mime });
        p.cleanup();
        p.resolve({ blob, blobUrl: URL.createObjectURL(blob), mime: p.mime, size: p.got });
        break;
      case "err":
        this.pending.delete(reqId);
        this.failedRequests++;
        this.lastError = msg.msg || "request failed";
        p.cleanup();
        p.reject(new Error(`peerMedia: ${msg.msg || "request failed"}`));
        break;
      case "ping":
        try { p.conn.send(JSON.stringify({ type: "ping-ack" })); } catch { /* 通道已死 */ }
        break;
      default:
        break;
    }
  }

  // startKeepalive: 启动断线感知定时器
  startKeepalive(): void {
    this.lastActive = Date.now();
    this.kaTimer = setInterval(() => {
      if (this.closed) { clearInterval(this.kaTimer!); return; }
      if (Date.now() - this.lastActive > KEEPALIVE_TIMEOUT) {
        clearInterval(this.kaTimer!);
        this.teardown("keepalive timeout");
        return;
      }
      try {
        this.controlConn?.send(JSON.stringify({ type: "ping" }));
      } catch { /* 连接已死, 超时兜底 */ }
    }, KEEPALIVE_INTERVAL);
  }

  // failAll: 连接级失败, reject 全部在途请求
  failAll(msg: string): void {
    if (this.closed) return;
    this.closed = true;
    this.opening = false;
    this.lastError = msg;
    if (this.kaTimer) { clearInterval(this.kaTimer); this.kaTimer = null; }
    if (this._poolTimer) { clearInterval(this._poolTimer); this._poolTimer = null; }
    this.clearChannelPool();
    const err = new Error(`peerMedia: ${msg}`);
    for (const [, p] of this.pending) {
      this.failedRequests++;
      p.cleanup();
      p.reject(err);
    }
    this.pending.clear();
    if (this._waitingForReady) {
      for (const q of this._waitingForReady) {
        this.failedRequests++;
        q.reject(err);
      }
      this._waitingForReady = null;
    }
    this.closePeer();
  }

  // teardown: 连接关闭
  teardown(msg: string): void {
    if (this.closed) return;
    this.failAll(msg);
  }

  // closePeer: 清理 Peer 对象
  closePeer(): void {
    try { this.peer?.destroy(); } catch { /* 幂等 */ }
    this.peer = null;
    this.controlConn = null;
  }
}

// ====== 类型定义 ======
type PendingEntry = {
  resolve: (v: LoadResult) => void;
  reject: (e: Error) => void;
  chunks: Uint8Array[];
  mime: string | null;
  size: number;
  got: number;
  conn: DataConnection;
  listeners: {
    data?: (data: unknown) => void;
    close?: () => void;
    error?: (error: any) => void;
    open?: () => void;
  };
  cleanup: () => void;
  // 26-09-08: 进度回调
  onProgress?: (got: number, total: number, percent: number) => void;
  _lastProgressPct: number;
  _progressStart: number;
};

export type LoadResult = {
  blob: Blob;
  blobUrl: string;
  mime: string;
  size: number;
};

export type ConnectionStatus = {
  connected: boolean;
  pending: number;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  lastError: string | null;
  lastActive: number;
};

export type TestConnectionResult = {
  success: boolean;
  latency: number | null;
  error: string | null;
};

export type RetryConfig = {
  maxRetries: number;
  retryDelay: number;
  retryMultiplier: number;
};

const DEFAULT_RETRY: RetryConfig = { maxRetries: 2, retryDelay: 1000, retryMultiplier: 2 };

// ====== 工具函数 ======
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ====== PeerMediaClient 主类 ======
export class PeerMediaClient {
  private slots = new Map<string, ConnectionSlot>();

  // 26-09-08: Blob URL 追踪 + 自动回收 (防内存泄漏)
  private blobUrls = new Map<string, ReturnType<typeof setTimeout>>();
  private blobUrlMaxAge = 5 * 60 * 1000; // 5 分钟

  // 26-09-08: LRU 下载缓存 (避免重复拉取同一 URL)
  private cache = new Map<string, LoadResult>();
  private maxCacheSize = 20;       // 最多缓存 20 个文件
  private maxCacheBytes = 50 * 1024 * 1024; // 最多缓存 50MB
  private cacheBytes = 0;

  // 26-09-08: 并发控制 (每个连接槽最多同时处理 N 个请求)
  private maxConcurrent = 4;

  // load: 加载 URL 资源, 返回 { blob, blobUrl, mime, size }
  // 26-09-08: 支持指数退避重试 (默认 2 次) + onProgress 进度回调
  async load(
    url: string,
    opts: { peer: string; signaling?: SignalingConfig; signal?: AbortSignal; retry?: RetryConfig; onProgress?: (got: number, total: number, percent: number) => void } = { peer: "" }
  ): Promise<LoadResult> {
    if (!opts.peer) throw new Error("peerMedia: peer (node peer id) is required");
    if (!url || typeof url !== "string") throw new Error("peerMedia: url is required");

    // 26-09-08: 检查下载缓存
    const cached = this._getCache(url);
    if (cached) {
      return cached;
    }

    const retry = opts.retry || DEFAULT_RETRY;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
      if (opts.signal?.aborted) throw new DOMException("aborted", "AbortError");

      try {
        const result = await this._load(url, opts);
        // 注册 blob URL 用于自动回收
        this._registerBlobUrl(result.blobUrl);
        // 26-09-08: 写入下载缓存
        this._putCache(url, result);
        return result;
      } catch (err) {
        // 如果是 AbortError, 直接抛出 (不重试)
        if (err.name === "AbortError") throw err;
        // 如果是参数错误, 直接抛出 (不重试)
        if (err.message?.startsWith("peerMedia: peer") || err.message?.startsWith("peerMedia: url")) throw err;

        lastError = err as Error;
        // 如果还有重试次数, 等待后重试
        if (attempt < retry.maxRetries) {
          const delay = retry.retryDelay * Math.pow(retry.retryMultiplier, attempt);
          await sleep(delay);
        }
      }
    }
    throw lastError || new Error("peerMedia: load failed");
  }

  // _load: 内部加载 (不含重试逻辑)
  private async _load(url: string, opts: { peer: string; signaling?: SignalingConfig; signal?: AbortSignal; onProgress?: (got: number, total: number, percent: number) => void }): Promise<LoadResult> {
    const sig = opts.signaling || DEFAULT_SIGNALING;
    const key = `${signalingKey(sig)}|${opts.peer}`;

    let slot = this.slots.get(key);
    if (!slot || slot.closed) {
      slot = new ConnectionSlot(opts.peer, sig);
      this.slots.set(key, slot);
    }
    if (opts.signal?.aborted) throw new DOMException("aborted", "AbortError");

    return new Promise((resolve, reject) => {
      slot.request(url, resolve, reject, opts.signal, opts.onProgress);
    });
  }

  // 26-09-08: 连接测试 — 尝试建立连接并发送测试请求
  async testConnection(peer: string, signaling?: SignalingConfig): Promise<TestConnectionResult> {
    if (!peer) return { success: false, latency: null, error: "peer id is required" };

    const sig = signaling || DEFAULT_SIGNALING;
    const testUrl = "https://pbs.twimg.com/media/" + "AAsAsAsAsAs".repeat(3); // 一个很短的测试 URL

    const startTime = Date.now();
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 15000);

    try {
      await this._load(testUrl, { peer, signaling: sig, signal: ac.signal });
      clearTimeout(timeout);
      return { success: true, latency: Date.now() - startTime, error: null };
    } catch (err) {
      clearTimeout(timeout);
      return { success: false, latency: Date.now() - startTime, error: (err as Error).message };
    }
  }

  // ====== 26-09-08: 下载缓存 (LRU) ======

  // 从缓存获取
  private _getCache(url: string): LoadResult | null {
    const cached = this.cache.get(url);
    if (cached) {
      // LRU: 移到末尾 (最近使用)
      this.cache.delete(url);
      this.cache.set(url, cached);
      return { ...cached }; // 返回副本
    }
    return null;
  }

  // 写入缓存
  private _putCache(url: string, result: LoadResult): void {
    // 检查是否已存在
    const existing = this.cache.get(url);
    if (existing) {
      // 移除旧缓存的 blob URL
      this._revokeBlobUrl(existing.blobUrl);
    }

    // 写入新缓存
    this.cache.set(url, result);
    this.cacheBytes += result.size;

    // 淘汰: 超过数量限制
    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const oldest = this.cache.get(oldestKey);
        if (oldest) {
          this._revokeBlobUrl(oldest.blobUrl);
          this.cacheBytes -= oldest.size;
        }
        this.cache.delete(oldestKey);
      }
    }

    // 淘汰: 超过字节限制
    while (this.cacheBytes > this.maxCacheBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      const oldest = this.cache.get(oldestKey);
      if (oldest) {
        this._revokeBlobUrl(oldest.blobUrl);
        this.cacheBytes -= oldest.size;
      }
      this.cache.delete(oldestKey);
    }
  }

  // 获取缓存统计
  getCacheStats(): { count: number; bytes: number, maxCount: number, maxBytes: number } {
    return {
      count: this.cache.size,
      bytes: this.cacheBytes,
      maxCount: this.maxCacheSize,
      maxBytes: this.maxCacheBytes,
    };
  }

  // 清除缓存
  clearCache(): void {
    for (const [, result] of this.cache) {
      this._revokeBlobUrl(result.blobUrl);
    }
    this.cache.clear();
    this.cacheBytes = 0;
  }

  // 26-09-08: 获取连接状态
  getConnectionStatus(peer: string, signaling?: SignalingConfig): ConnectionStatus {
    const sig = signaling || DEFAULT_SIGNALING;
    const key = `${signalingKey(sig)}|${peer}`;
    const slot = this.slots.get(key);
    if (!slot) {
      return {
        connected: false, pending: 0, totalRequests: 0,
        successRequests: 0, failedRequests: 0, lastError: null, lastActive: 0,
      };
    }
    return {
      connected: slot.ready && !slot.closed,
      pending: slot.pending.size,
      totalRequests: slot.totalRequests,
      successRequests: slot.successRequests,
      failedRequests: slot.failedRequests,
      lastError: slot.lastError,
      lastActive: slot.lastActive,
    };
  }

  // 26-09-08: 注册 blob URL 用于自动回收
  private _registerBlobUrl(blobUrl: string): void {
    const timer = setTimeout(() => {
      try { URL.revokeObjectURL(blobUrl); } catch { /* 幂等 */ }
      this.blobUrls.delete(blobUrl);
    }, this.blobUrlMaxAge);
    this.blobUrls.set(blobUrl, timer);
  }

  // 26-09-08: 释放 blob URL (不清除定时器, 用于缓存淘汰)
  private _revokeBlobUrl(blobUrl: string): void {
    try { URL.revokeObjectURL(blobUrl); } catch { /* 幂等 */ }
    const timer = this.blobUrls.get(blobUrl);
    if (timer) {
      clearTimeout(timer);
      this.blobUrls.delete(blobUrl);
    }
  }

  // dispose: 主动释放到某 peer 的连接
  dispose(peer: string, signaling?: SignalingConfig): void {
    const sig = signaling || DEFAULT_SIGNALING;
    const key = `${signalingKey(sig)}|${peer}`;
    const slot = this.slots.get(key);
    if (slot) {
      slot.failAll("disposed");
      this.slots.delete(key);
    }
  }

  // 26-09-08: 释放所有连接 (页面卸载时调用)
  disposeAll(): void {
    for (const [key, slot] of this.slots) {
      slot.failAll("disposed");
      this.slots.delete(key);
    }
    // 清理缓存 (包含 blob URL)
    this.clearCache();
    // 清理所有 blob URL
    for (const [url, timer] of this.blobUrls) {
      clearTimeout(timer);
      try { URL.revokeObjectURL(url); } catch { /* 幂等 */ }
    }
    this.blobUrls.clear();
  }

  // 26-09-08: 手动释放一个 blob URL (提前回收)
  revokeBlobUrl(blobUrl: string): void {
    const timer = this.blobUrls.get(blobUrl);
    if (timer) {
      clearTimeout(timer);
      this.blobUrls.delete(blobUrl);
    }
    try { URL.revokeObjectURL(blobUrl); } catch { /* 幂等 */ }
  }
}

// 模块级单例
export const client = new PeerMediaClient();
export default client;
