const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const mqttService = require('./services/mqtt-service');
const websocketService = require('./services/websocket-service');
const apiRoutes = require('./routes/api-routes');
const dataStore = require('./data/data-store');
const { initDatabase } = require('./database/db');
const logger = require('./utils/logger');
const routeGuard = require('./middlewares/route-guard');

// 初始化Express应用
const app = express();
app.use(express.json());
app.use(cookieParser());

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket服务
const wss = websocketService.init(server);

// 初始化MQTT客户端
const mqttClient = mqttService.init(wss);

// 应用路由保护中间件 - 必须在API路由和静态文件服务之前
app.use(routeGuard);

// 设置API路由
app.use('/api', apiRoutes);

// 为前端单页应用提供路由支持
app.get('/login', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'login.html'));
});

app.get('/admin', (req, res) => {
  // 路由已被保护，这里只需直接提供文件
  res.sendFile(path.join(config.PUBLIC_DIR, 'admin.html'));
});

app.get('/user', (req, res) => {
  // 路由已被保护，这里只需直接提供文件
  res.sendFile(path.join(config.PUBLIC_DIR, 'user.html'));
});

// 重定向根路径到登录页
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 静态文件服务
app.use(express.static(config.PUBLIC_DIR));

// 404处理
app.use((req, res) => {
  res.status(404).send('页面未找到');
});

// 初始化数据库
initDatabase()
  .then(() => {
    logger.info('数据库初始化成功');
  })
  .catch(error => {
    logger.error('数据库初始化失败', error);
    process.exit(1);
  });

// 导出应用组件
module.exports = {
  app,
  server,
  wss,
  mqttClient
};