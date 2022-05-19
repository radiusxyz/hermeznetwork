#constants_empty.js를 사용해서 constants_generate.js를 생성
#!/bin/bash 
source ./env.sh



cp -f $SDK_PATH/constants_empty.js $SDK_PATH/constants_generate.js 
echo "cp -f $SDK_PATH/constants_empty.js $SDK_PATH/constants_generate.js "

n=2048
line=8
for ((i=1;i<=$n;i++)); do
    sed -i "$line i\const EXAMPLES_PRIVATE_KEY$i = ''" $SDK_PATH/constants_generate.js
    line=$(($line + 1)) 
done


line=2078
for ((i=1;i<=$n;i++)); do
    sed -i "$line i\  EXAMPLES_PRIVATE_KEY$i," $SDK_PATH/constants_generate.js
    line=$(($line + 1)) 
done