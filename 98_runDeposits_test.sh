#!/bin/bash 
source ./env.sh

DEPOSIT_PATH=$SDK_PATH/deposits

start=$1
end=$2
for ((i=$start;i<=$end;i++)); do
    node $DEPOSIT_PATH/creates-accounts-deposits$i.js &
    echo "node $DEPOSIT_PATH/creates-accounts-deposits$i.js"
    sleep 0.01
done

