#!/bin/bash 
source ../env.sh

echo $ACCOUNT_FILE
isHeader=0
i=1
while read addr privteKey; do 
    if((isHeader==0)); then
        isHeader=1
        continue
    fi
    node sendTx.js $addr
    echo "DONE $i"
    i=$(($i + 1)) 
done < $ACCOUNT_FILE
