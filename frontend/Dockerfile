FROM node:18

WORKDIR /app

COPY package.json ./

RUN npm install
RUN npm install @mui/material  
RUN npm install @mui/icons-material --force
RUN npm install @mui/system @mui/styled-engine @emotion/react @emotion/styled --force
RUN npm install web-vitals --force

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
