#!/bin/bash 
#hermezjs에서 deposit할 js파일 생성
source ./env.sh

DEPOSIT_PATH=$SDK_PATH/deposits

rm -rf $DEPOSIT_PATH
mkdir $DEPOSIT_PATH


numAccount=-1 # 처음에 head(addr, privateKey) 미포함
while read line; do 
    numAccount=$(($numAccount + 1)) 
done < $ACCOUNT_FILE

echo $numAccount # account 갯수

for ((i=1;i<=$numAccount;i++)); do
    cp -f $SDK_PATH/creates-accounts-deposits_empty.js $DEPOSIT_PATH/creates-accounts-deposits$i.js
    sed -i "s/EXAMPLES_PRIVATE_KEY_A/EXAMPLES_PRIVATE_KEY$i/g" $DEPOSIT_PATH/creates-accounts-deposits$i.js
done

