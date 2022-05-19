#!/bin/bash 
source ./env.sh

DEPOSIT_PATH=$SDK_PATH/deposits

numAccount=-1 # 처음에 head(addr, privateKey) 미포함
while read line; do 
    numAccount=$(($numAccount + 1)) 
done < $ACCOUNT_FILE

echo $numAccount # account 갯수

for ((i=1;i<=$numAccount;i++)); do
    node $DEPOSIT_PATH/creates-accounts-deposits$i.js &
    echo "node $DEPOSIT_PATH/creates-accounts-deposits$i.js"
    sleep 0.01
done








# idx=1
# epoch=50
# loop_break=0
# for ((i=1;;)); do
#     for((j=0;j<$epoch;j++)); do
#         if (($idx > $numAccount)); then
#             loop_break=1
#             break
#         fi
#         node $DEPOSIT_PATH/creates-accounts-deposits$idx.js &
#         echo "node DEPOSIT_PATH/creates-accounts-deposits$idx.js"
#         idx=$(($idx + 1)) 
#     done
#     if (($loop_break==1)); then
#         break
#     fi
#     echo "sleep 240s =>" $idx
#     sleep 240s
# done
