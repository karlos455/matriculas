FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

ARG REACT_APP_API_URL=http://localhost:5000/matriculas
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN echo "REACT_APP_API_URL=${REACT_APP_API_URL}" > .env.local

EXPOSE 3000

CMD ["npm", "start"]
