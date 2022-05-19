#!/bin/bash 


source ./env.sh

initFlag=$1
cd $HERMEZ_PATH/contracts
source callContracts.sh $initFlag