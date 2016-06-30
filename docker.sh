docker build -t ourguide/fandomcup-app .
docker run -p 4040:4040 -d --name fandomcup-app ourguide/fandomcup-app
