docker-compose down && docker-compose up -d --build 
docker image rm karlos2/frontend-matriculas:dev
docker image rm karlos2/backend-matriculas:dev
docker image tag matricula-app_frontend karlos2/frontend-matriculas:dev
docker image tag matricula-app_backend karlos2/backend-matriculas:dev
docker push karlos2/frontend-matriculas:dev
docker push karlos2/backend-matriculas:dev
docker image ls
docker-compose logs -f