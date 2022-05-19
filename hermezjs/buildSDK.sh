#!/bin/bash 


init=$1
if [ $init == "first" ]; then
    yarn install
    echo "first!"
else
    echo "alreay execute yarn install !"
fi
    yarn build-node