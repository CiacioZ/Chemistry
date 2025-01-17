docker build . -t vscodeserver
docker create -it --init -p 3000:3000 -p 9090:9090 --name vscodeserver -v "$(pwd):/home/workspace:cached" vscodeserver

