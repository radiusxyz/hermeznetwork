#constants_generate.js를 사용해서 constants.js를 생성
#!/bin/bash 
source ./env.sh

rm -f $SDK_PATH/constants.js
cp -f $SDK_PATH/constants_generate.js $SDK_PATH/constants.js 
echo "cp -f $SDK_PATH/constants_generate.js $SDK_PATH/constants.js"

i=0
while read addr privteKey; do 
    if (($i == 0))
    then 
        i=$(($i + 1)) 
        continue
    fi
    sed -i "s/const EXAMPLES_PRIVATE_KEY$i = ''/const EXAMPLES_PRIVATE_KEY$i = '$privteKey'/g" $SDK_PATH/constants.js
    i=$(($i + 1)) 
done < $ACCOUNT_FILE

echo DONE
