const express = require('express');
const http = require('http');
const path = require('path');
const config = require('./config');
const mqttService = require('./services/mqtt-service');
const websocketService = require('./services/websocket-service');
const apiRoutes = require('./routes/api-routes');
const dataStore = require('./data/data-store');

// 初始化Express应用
const app = express();
app.use(express.json());
app.use(express.static(config.PUBLIC_DIR));

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket服务
const wss = websocketService.init(server);

// 初始化MQTT客户端
const mqttClient = mqttService.init(wss);

// 设置API路由
app.use('/api', apiRoutes);

// 导出应用组件
module.exports = {
  app,
  server,
  wss,
  mqttClient
};