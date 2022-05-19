#hermezjs에서 Layer2끼리 transfer할 js파일 생성
#!/bin/bash 
source ./env.sh

L2TX_PATH=$SDK_PATH/l2txs

rm -rf $L2TX_PATH
mkdir $L2TX_PATH


numAccount=-1 # 처음에 head(addr, privateKey) 미포함
while read line; do 
    numAccount=$(($numAccount + 1)) 
done < $ACCOUNT_FILE

echo $numAccount # account 갯수

for ((i=1;i<=$numAccount;i++)); do
    cp -f $SDK_PATH/transfer_empty.js $L2TX_PATH/transfer$i.js
    sed -i "s/EXAMPLES_PRIVATE_KEY_A/EXAMPLES_PRIVATE_KEY$i/g" $L2TX_PATH/transfer$i.js
    if (($(($i+1)) > $numAccount))
    then
        echo "final"
        sed -i "s/EXAMPLES_PRIVATE_KEY_B/EXAMPLES_PRIVATE_KEY1/g" $L2TX_PATH/transfer$i.js
    else
        sed -i "s/EXAMPLES_PRIVATE_KEY_B/EXAMPLES_PRIVATE_KEY$(($i+1))/g" $L2TX_PATH/transfer$i.js
    fi
    
done
