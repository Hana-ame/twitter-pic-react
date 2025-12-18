npm run build ;
mv ./build/index.html ./build/index_new.html ;
~/script/scp.sh -r ./build/ root@vps.moonchan.xyz:~/twitter/ ;
mv ./build/index_new.html ./build/index.html ;
~/script/scp.sh ./build/index.html root@vps.moonchan.xyz:~/twitter/build/ ;
rm -rf ./build/

git commit -am 'commit by build.sh'; git push;