npm run build ;
mv ./build/index.html index.html
~/script/scp.sh -r ./build/ root@142.171.157.74:~/twitter/ ;
~/script/scp.sh index.html root@142.171.157.74:~/twitter/ ;
rm index.html
rm -rf ./build/;

date;   