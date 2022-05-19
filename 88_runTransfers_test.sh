#!/bin/bash 
source ./env.sh

L2TX_PATH=$SDK_PATH/l2txs


start=$1
end=$2
for ((i=$start;i<=$end;i++)); do
    node $L2TX_PATH/transfer$i.js &
    echo "node $L2TX_PATH/transfer$i.js"
    sleep 0.01
done

