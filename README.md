# matriculas

## Ambientes (dev vs prod)

- O frontend lê `process.env.REACT_APP_API_URL` para escolher o backend.
- Usa `.env.development` (dev local) e `.env.production` (build/prod) criados via Create React App.
- `npm start` carrega automaticamente `.env.development` e aponta para `http://localhost:5000/matriculas`.
- `npm run build`/deploy usa `.env.production`, apontando para `https://matriculas.casadocarlos.info/matriculas`.
- Os scripts `pushdev.sh` e `pushprod.sh` exportam `REACT_APP_API_URL` antes de chamarem `docker-compose`, garantindo que o Dockerfile cria a `.env.local` certa.
- Ajusta estes ficheiros se precisares de outros endpoints ou usa variáveis de ambiente no CI/CD.
