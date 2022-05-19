#!/bin/bash 
source ./env.sh

CONTRACTS_PATH="$HERMEZ_PATH/contracts"

cd $CONTRACTS_PATH
npx hardhat run scripts/klaytnTestnet-deployment/localDeploy.js --network klaytn
