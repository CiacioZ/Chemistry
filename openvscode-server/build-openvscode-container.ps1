docker build . -t vscodeserver
docker create -it --init -p 3000:3000 -p 9090:9090 -p 8080:8080 --name vscodeserver -v "$(pwd):/home/workspace:cached" vscodeserver

