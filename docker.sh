docker stop fc-api-app
docker rm fc-api-app
docker rmi ourguide/fc-api-app
docker build -t ourguide/fc-api-app .
docker run -p 3033:3000 \
		   --name fc-api-app \
		   --restart=always \
		   -d ourguide/fc-api-app
