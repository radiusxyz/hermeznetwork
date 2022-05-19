#!/bin/bash 


init=$1
if [ $init == "first" ]; then
    yarn install
    echo "first!"
else
    echo "alreay execute yarn install !"
fi

npx hardhat run scripts/klaytnTestnet-deployment/deploy.js --network klaytn
