const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 验证用户是否已登录
 */
function authenticateUser(req, res, next) {
  try {
    // 从cookie或请求头获取令牌
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权，请先登录' });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error('身份验证失败', error);
    res.status(401).json({ success: false, message: '登录会话已过期，请重新登录' });
  }
}

/**
 * 验证用户是否为管理员
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }
  next();
}

/**
 * 验证用户是否有权限访问特定设备
 */
async function checkDeviceAccess(req, res, next) {
  try {
    // 管理员有权访问所有设备
    if (req.user.role === 'admin') {
      return next();
    }
    
    const deviceId = req.params.deviceId || req.body.deviceId;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, message: '需要设备ID' });
    }
    
    const { pool } = require('../database/db');
    
    // 检查用户是否有权限访问该设备
    const [permissions] = await pool.query(
      'SELECT * FROM device_permissions WHERE user_id = ? AND device_id = ?',
      [req.user.userId, deviceId]
    );
    
    if (permissions.length === 0) {
      return res.status(403).json({ success: false, message: '您没有权限访问此设备' });
    }
    
    next();
  } catch (error) {
    logger.error('检查设备访问权限时出错', error);
    res.status(500).json({ success: false, message: '验证设备访问权限失败' });
  }
}

/**
 * 验证用户是否有权限查看设备数据
 */
async function checkDeviceReadAccess(req, res, next) {
  try {
    // 管理员有权访问所有设备
    if (req.user.role === 'admin') {
      return next();
    }
    
    const deviceId = req.params.deviceId || req.body.deviceId || req.query.deviceId;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, message: '需要设备ID' });
    }
    
    const { pool } = require('../database/db');
    
    // 检查用户是否有权限访问该设备
    const [permissions] = await pool.query(
      'SELECT * FROM device_permissions WHERE user_id = ? AND device_id = ?',
      [req.user.id, deviceId]
    );
    
    if (permissions.length === 0) {
      return res.status(403).json({ success: false, message: '您没有权限访问此设备数据' });
    }
    
    next();
  } catch (error) {
    logger.error('检查设备数据访问权限时出错', error);
    res.status(500).json({ success: false, message: '验证设备数据访问权限失败' });
  }
}

/**
 * 只允许管理员控制设备
 */
function adminOnlyDeviceControl(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: '只有管理员可以控制设备'
    });
  }
  next();
}

module.exports = {
  authenticateUser,
  requireAdmin,
  checkDeviceAccess,
  checkDeviceReadAccess,
  adminOnlyDeviceControl
};