FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

ARG REACT_APP_API_URL=http://localhost:5000/matriculas
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN echo "REACT_APP_API_URL=${REACT_APP_API_URL}" > .env.local \
  && npm run build

FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
