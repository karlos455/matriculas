#!/usr/bin/env bash

set -euo pipefail

export DOCKER_DEFAULT_PLATFORM="${DOCKER_DEFAULT_PLATFORM:-linux/amd64}"

docker-compose build --no-cache frontend backend
unset DOCKER_DEFAULT_PLATFORM 

docker image rm karlos2/frontend-matriculas:latest >/dev/null 2>&1 || true
docker image rm karlos2/backend-matriculas:latest >/dev/null 2>&1 || true
docker image tag matricula-app_frontend karlos2/frontend-matriculas:latest
docker image tag matricula-app_backend karlos2/backend-matriculas:latest
docker push karlos2/frontend-matriculas:latest
docker push karlos2/backend-matriculas:latest
docker image ls
