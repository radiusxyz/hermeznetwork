#!/bin/bash

MaxTx=2048

#NODE & SDK (contracts 할때마다 수정필요)
HERMEZ_ROLLUP_ADDRESS="0xbCd8018c95Cd1DCa29F241aef3f3B02Ebf1B5bD3"
HERMEZ_WDELAYER_ADDRESS="0x118b8dF041AEF3d8bd44CFd46929c41e8EEfbd13"

HERMEZ_PATH="$GOPATH/src/github.com/hermez"

SDK_PATH="$HERMEZ_PATH/hermezjs/examples"
ACCOUNT_FILE10="$HERMEZ_PATH/accountsInfo10"
ACCOUNT_FILE400="$HERMEZ_PATH/accountsInfo400"
ACCOUNT_FILE2048="$HERMEZ_PATH/accountsInfo2048"
ACCOUNT_FILE=$ACCOUNT_FILE2048

ForgerAddress="0xB2936f054560409973FfFaa7D5FDAe9E5C8B628E"
# MNEMONIC="clean recycle slow mango hint motion cliff light feed perfect scan neglect"
