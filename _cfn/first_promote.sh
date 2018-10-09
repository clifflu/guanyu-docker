#!/bin/sh

echo Enter Guanyu CD User\'s access key ID:
read id
echo Enter Guanyu CD User\'s secret access key:
read secret

aws configure set aws_access_key_id $id
aws configure set aws_secret_access_key $secret
$(aws ecr get-login --no-include-email --region ap-northeast-1)

docker build -t guanyu-product-web -f ../web/Dockerfile ..
docker build -t guanyu-product-fetch -f ../fetch/Dockerfile ..
docker build -t guanyu-product-sophosav -f ../sophosav/Dockerfile ..

docker tag guanyu-product-web:latest 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-web:latest
docker tag guanyu-product-fetch:latest 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-fetch:latest
docker tag guanyu-product-sophosav:latest 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-sophosav:latest

docker push 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-web:latest
docker push 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-fetch:latest
docker push 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-sophosav:latest

docker image rm 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-web
docker image rm 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-fetch
docker image rm 408772917132.dkr.ecr.ap-northeast-1.amazonaws.com/guanyu-sophosav
