FROM node:16-alpine

WORKDIR /app

# 安装 SQLite 和 MySQL 客户端依赖
RUN apk add --no-cache sqlite sqlite-dev mysql-client
RUN apk add --no-cache --virtual .build-deps python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm install
# 移除构建依赖以减小镜像大小
RUN apk del .build-deps

# Copy application code
COPY . .

EXPOSE 1883
EXPOSE 3000

CMD ["node", "server.js"]