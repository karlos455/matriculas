# matriculas

## Ambientes (dev vs prod)

- O frontend lê `process.env.REACT_APP_API_URL` para escolher o backend.
- Usa `.env.development` (dev local) e `.env.production` (build/prod) criados via Create React App.
- `npm start` carrega automaticamente `.env.development` e aponta para `http://localhost:5000/matriculas`.
- `npm run build`/deploy usa `.env.production`, apontando para `https://matriculas.casadocarlos.info/matriculas`.
- Os scripts `pushdev.sh` e `pushprod.sh` exportam `REACT_APP_API_URL` antes de chamarem `docker-compose`, garantindo que o Dockerfile cria a `.env.local` certa.
- Ambos forçam `DOCKER_DEFAULT_PLATFORM=linux/amd64`, garantindo imagens compatíveis com o servidor x86_64.

## Autenticação

- Define `ADMIN_USERNAME` (opcional) e **obrigatoriamente** `ADMIN_PASSWORD` no backend.
  - Podes guardá-las no ficheiro `.env` na raiz (git-ignored) para que o `docker-compose` e os scripts as leiam automaticamente. Caso contrário, `pushdev.sh` / `pushprod.sh` pedem-nas interativamente.
- O login no frontend envia as credenciais para `POST /auth/login`; o backend valida com as variáveis acima e devolve um token de sessão temporário.
- Cada token expira automaticamente após 24h sem atividade; qualquer 401 força novo login.
- O backend bloqueia o IP após 5 tentativas falhadas em 10 minutos (bloqueio de 15 minutos) para mitigar brute-force. Cada bloqueio é registado em `blocked.log` (na raiz do projeto via bind mount) ou no caminho definido por `BLOCK_LOG_FILE`.
- As chamadas subsequentes do frontend incluem `Authorization: Bearer <token>`.
- Ajusta estes ficheiros se precisares de outros endpoints ou usa variáveis de ambiente no CI/CD.
