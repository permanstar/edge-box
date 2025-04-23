const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const mqttService = require('./services/mqtt-service');
const websocketService = require('./services/websocket-service');
const apiRoutes = require('./routes/api-routes');
const adminRoutes = require('./routes/admin-routes');  // 添加这一行
const dataStore = require('./data/data-store');
const { initDatabase } = require('./database/db');
const logger = require('./utils/logger');
const routeGuard = require('./middlewares/route-guard');

// 初始化Express应用
const app = express();

// 基础中间件
app.use(express.json());                     // 解析JSON请求体
app.use(cookieParser());                     // 解析Cookie

// 无需认证的API路由
app.use('/api/login', apiRoutes);           // 登录API不需要认证
app.use('/api/logout', apiRoutes);          // 登出API不需要认证

// 设置无需认证的页面路由（放在路由保护前）
app.get('/login', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'login.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

// 公开路由 - 在路由保护中间件之前
app.get('/register', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'register.html'));
});

// 在静态文件之前添加页面路由
app.get('/user', (req, res) => {
  // 添加调试日志
  console.log('用户正在访问用户页面', req.cookies);
  res.sendFile(path.join(config.PUBLIC_DIR, 'user.html'));
});

app.get('/user.html', (req, res) => {
  // 添加调试日志
  console.log('用户正在访问用户页面', req.cookies);
  res.sendFile(path.join(config.PUBLIC_DIR, 'user.html'));
});

// 静态资源（CSS/JS/图片等）
app.use(express.static(config.PUBLIC_DIR));

// 路由保护中间件（放在需要保护的路由前）
app.use((req, res, next) => {
  // 排除已定义的公共路径
  if (req.path === '/login' || req.path === '/' || 
      req.path.startsWith('/api/login') || 
      req.path.startsWith('/api/logout')) {
    return next();
  }
  
  // 应用路由保护
  routeGuard(req, res, next);
});

// 需要认证的API路由
app.use('/api', apiRoutes);
app.use('/', adminRoutes);

// 需要认证的页面路由
app.get('/admin', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'admin.html'));
});

app.get('/user', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'user.html'));
});

// 调试路由 - 了解当前令牌内容和路由保护行为
app.get('/debug-token', (req, res) => {
  try {
    const token = req.cookies.auth_token;
    let decoded = null;
    
    if (token) {
      decoded = jwt.verify(token, config.JWT_SECRET);
    }
    
    res.json({
      token: token ? '已设置' : '未设置',
      decoded: decoded,
      userFields: decoded ? Object.keys(decoded) : [],
      hasUserId: decoded ? 'userId' in decoded : false,
      hasId: decoded ? 'id' in decoded : false,
      role: decoded ? decoded.role : '未知'
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket服务
const wss = websocketService.init(server);

// 初始化MQTT客户端
const mqttClient = mqttService.init(wss);

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