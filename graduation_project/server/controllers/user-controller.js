const { pool } = require('../database/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  /**
   * 用户登录
   */
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      }
      
      // 查询用户
      const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      if (users.length === 0) {
        return res.status(401).json({ success: false, message: '用户名或密码不正确' });
      }
      
      const user = users[0];
      
      // 验证密码
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: '用户名或密码不正确' });
      }
      
      // 更新最后登录时间
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
      
      // 创建JWT令牌
      const token = jwt.sign(
        { 
          userId: user.id,      // 改为 userId 以保持一致性
          username: user.username, 
          role: user.role 
        }, 
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // 设置cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24小时
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      logger.info(`用户 ${username} 登录成功`);
      
      res.json({
        success: true,
        message: '登录成功',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('用户登录时出错', error);
      res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
    }
  },
  
  /**
   * 用户注册
   */
  register: async (req, res) => {
    try {
      const { username, password, role = 'user' } = req.body;
      
      // 基本验证
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      }
      
      // 权限检查 - 只有管理员可以创建管理员账户
      if (role === 'admin' && (!req.user || req.user.role !== 'admin')) {
        return res.status(403).json({ success: false, message: '只有管理员可以创建管理员账户' });
      }
      
      // 检查用户名是否已存在
      const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      if (existingUsers.length > 0) {
        return res.status(409).json({ success: false, message: '用户名已存在' });
      }
      
      // 密码加密
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 创建新用户
      const [result] = await pool.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
      );
      
      logger.info(`新用户 ${username} 已创建，角色: ${role}`);
      
      res.status(201).json({
        success: true,
        message: '用户注册成功',
        userId: result.insertId
      });
    } catch (error) {
      logger.error('用户注册时出错', error);
      res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
    }
  },
  
  /**
   * 用户登出
   */
  logout: (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true, message: '登出成功' });
  },
  
  /**
   * 获取用户信息
   */
  getProfile: async (req, res) => {
    try {
      // 确保使用一致的用户ID字段
      const userId = req.user.userId || req.user.id;
      
      if (!userId) {
        logger.error('无法获取用户ID', req.user);
        return res.status(400).json({ success: false, message: '无效的用户信息' });
      }
      
      const [users] = await pool.query(
        'SELECT id, username, role, created_at, last_login FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      
      // 如果是普通用户，获取其可访问的设备
      let devices = [];
      if (req.user.role === 'user') {
        const [rows] = await pool.query(
          'SELECT device_id FROM device_permissions WHERE user_id = ?',
          [userId]
        );
        devices = rows.map(row => row.device_id);
      }
      
      res.json({
        success: true,
        user: users[0],
        devices: req.user.role === 'admin' ? 'all' : devices
      });
    } catch (error) {
      logger.error('获取用户信息时出错', error);
      res.status(500).json({ success: false, message: '获取用户信息失败' });
    }
  }
};