FROM node:16-alpine

WORKDIR /app

# 创建应用目录
COPY package*.json ./
RUN npm install --production

# 复制应用代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV MQTT_BROKER_URL=mqtt://mqtt-broker:1883
ENV TEMPERATURE_SENSORS=3
ENV HUMIDITY_SENSORS=3
ENV LIGHT_SENSORS=2
ENV PRESSURE_SENSORS=2
ENV DATA_SEND_INTERVAL=5000
ENV SIMULATE_FAILURES=false

# 暴露健康检查端口(如果有需要)
# EXPOSE 8080

# 设置启动命令
CMD ["node", "src/index.js"]