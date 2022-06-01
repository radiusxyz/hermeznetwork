#!/bin/bash 
source ./env.sh

NODE_PATH="$HERMEZ_PATH/hermez-node"
SDK_PATH="$HERMEZ_PATH/hermezjs/examples"
SDK_SOURCE_PATH="$HERMEZ_PATH/hermezjs/src"


cp -f $NODE_PATH/cmd/heznode/cfg.builder_empty.toml $NODE_PATH/cmd/heznode/cfg.builder.toml
sed -i "s/Rollup   = ''/Rollup   = '$HERMEZ_ROLLUP_ADDRESS'/g" $NODE_PATH/cmd/heznode/cfg.builder.toml
sed -i "s/ForgerAddress = ''/ForgerAddress = '$ForgerAddress'/g" $NODE_PATH/cmd/heznode/cfg.builder.toml
sed -i "s/MaxTx = 400/MaxTx = $MaxTx/g" $NODE_PATH/cmd/heznode/cfg.builder.toml




# constants.js에서 5번째 6번째 줄 삭제
sed -i "5d;6d" $SDK_PATH/constants.js
sleep 3s

line=5
sed -i "$line i\const EXAMPLES_HERMEZ_ROLLUP_ADDRESS = '$HERMEZ_ROLLUP_ADDRESS'" $SDK_PATH/constants.js
line=6
sed -i "$line i\const EXAMPLES_HERMEZ_WDELAYER_ADDRESS = '$HERMEZ_WDELAYER_ADDRESS'" $SDK_PATH/constants.js


cp -f $SDK_SOURCE_PATH/constants_empty.js $SDK_SOURCE_PATH/constants.js
sed -i "s/ContractNames.Hermez]: ''/ContractNames.Hermez]: '$HERMEZ_ROLLUP_ADDRESS'/g" $SDK_SOURCE_PATH/constants.js
sed -i "s/ContractNames.WithdrawalDelayer]: ''/ContractNames.WithdrawalDelayer]: '$HERMEZ_WDELAYER_ADDRESS'/g" $SDK_SOURCE_PATH/constants.js


cd $HERMEZ_PATH/hermezjs
source buildSDK.sh $initFlag


# NODE_PATH="$HERMEZ_PATH/hermez-node"
# cd $NODE_PATH
# source init.sh

