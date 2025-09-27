if [ -z "$ADMIN_USERNAME" ]; then
  read -rp "Introduz ADMIN_USERNAME (Enter para deixar vazio): " ADMIN_USERNAME
  export ADMIN_USERNAME
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  read -rsp "Introduz ADMIN_PASSWORD (não será guardada): " ADMIN_PASSWORD
  echo
  if [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ ADMIN_PASSWORD vazio. Deploy cancelado." >&2
    exit 1
  fi
  export ADMIN_PASSWORD
fi



export REACT_APP_API_URL="http://localhost:5000/matriculas"

docker-compose down && docker-compose up -d --build 
docker image rm karlos2/frontend-matriculas:dev
docker image rm karlos2/backend-matriculas:dev
docker image tag matricula-app_frontend karlos2/frontend-matriculas:dev
docker image tag matricula-app_backend karlos2/backend-matriculas:dev
docker push karlos2/frontend-matriculas:dev
docker push karlos2/backend-matriculas:dev
docker image ls
docker-compose logs -f
