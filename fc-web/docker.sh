#! /bin/sh

docker stop fc-app
docker rm fc-app
docker rmi ourguide/fc-app
docker build -t ourguide/fc-app .
docker run -p 3034:3000 \
		   --restart=always \
		   --name fc-app \
		   -d ourguide/fc-app
