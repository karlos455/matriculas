docker-compose build --no-cache frontend backend
docker image rm karlos2/frontend-matriculas:latest
docker image rm karlos2/backend-matriculas:latest
docker image tag matricula-app_frontend karlos2/frontend-matriculas:latest
docker image tag matricula-app_backend karlos2/backend-matriculas:latest
docker push karlos2/frontend-matriculas:latest
docker push karlos2/backend-matriculas:latest
docker image ls