const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 路由保护中间件 - 验证用户是否已登录
 */
function routeGuard(req, res, next) {
  // 允许不需要认证的路径通过
  const publicPaths = [
    '/login',
    '/api/login',
    '/css/',
    '/js/',
    '/images/',
    '/favicon.ico'
  ];
  
  // 检查路径是否为公开路径
  for (const path of publicPaths) {
    if (req.path === path || req.path.startsWith(path)) {
      return next();
    }
  }
  
  try {
    // 从cookie获取认证令牌
    const token = req.cookies.auth_token;
    
    if (!token) {
      // 如果是API请求，返回401错误
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: '未授权，请先登录' });
      }
      
      // 否则重定向到登录页面
      logger.info(`未认证的访问尝试：${req.path}，重定向到登录页面`);
      return res.redirect('/login');
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    
    // 只有管理员才能访问管理员页面
    if (req.path === '/admin' && req.user.role !== 'admin') {
      logger.warn(`非管理员用户 ${req.user.username} 尝试访问管理员页面`);
      return res.status(403).send('权限不足，需要管理员权限');
    }
    
    // 只有普通用户才能访问用户页面（管理员也可以访问，但将被重定向到管理员页面）
    if (req.path === '/user' && req.user.role === 'admin') {
      return res.redirect('/admin');
    }
    
    next();
  } catch (error) {
    logger.error('令牌验证失败', error);
    
    // 清除无效的cookie
    res.clearCookie('auth_token');
    
    // 如果是API请求，返回401错误
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
    }
    
    // 否则重定向到登录页面
    return res.redirect('/login');
  }
}

module.exports = routeGuard;