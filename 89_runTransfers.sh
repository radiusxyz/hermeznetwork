#!/bin/bash 
source ./env.sh

L2TX_PATH=$SDK_PATH/l2txs

numAccount=-1 # 처음에 head(addr, privateKey) 미포함
while read line; do 
    numAccount=$(($numAccount + 1)) 
done < $ACCOUNT_FILE

echo $numAccount # account 갯수

for ((i=1;i<=$numAccount;i++)); do
    node $L2TX_PATH/transfer$i.js &
    echo "node $L2TX_PATH/transfer$i.js"
    sleep 0.01
done

