const express = require('express');
const router = express.Router();
const { authenticateUser, requireAdmin } = require('../middlewares/auth-middleware');
const logger = require('../utils/logger');
const dataStore = require('../data/data-store');
const { pool } = require('../database/db');

// 应用管理员权限中间件
router.use(authenticateUser, requireAdmin);

// 获取所有普通用户
router.get('/api/admin/users', async (req, res) => {
  try {
    // 查询数据库获取所有普通用户
    const [users] = await pool.query(`
      SELECT id, username, role, created_at, last_login 
      FROM users 
      WHERE role = 'user'
      ORDER BY username
    `);
    
    res.json({ success: true, users });
    logger.info(`管理员 ${req.user.username} 获取用户列表，返回 ${users.length} 个用户`);
  } catch (error) {
    logger.error('获取用户列表失败', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// 管理员创建用户
router.post('/api/admin/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // 输入验证
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    
    // 验证角色
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的用户角色' });
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    // 密码加密
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role || 'user']
    );
    
    logger.info(`管理员 ${req.user.username} 创建了新用户: ${username} (角色: ${role || 'user'})`);
    
    res.status(201).json({
      success: true,
      message: '用户创建成功',
      userId: result.insertId
    });
  } catch (error) {
    logger.error('创建用户失败', error);
    res.status(500).json({ success: false, message: '创建用户失败' });
  }
});

// 修改用户角色
router.put('/api/admin/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // 验证角色
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的用户角色' });
    }
    
    // 检查用户是否存在
    const [users] = await pool.query(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新角色
    await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );
    
    logger.info(`管理员 ${req.user.username} 将用户 ${users[0].username} 的角色修改为 ${role}`);
    
    res.json({ success: true, message: '用户角色更新成功' });
  } catch (error) {
    logger.error('修改用户角色失败', error);
    res.status(500).json({ success: false, message: '修改用户角色失败' });
  }
});

// 删除用户
router.delete('/api/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 检查用户是否存在
    const [users] = await pool.query(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 删除用户
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    
    logger.info(`管理员 ${req.user.username} 删除了用户 ${users[0].username}`);
    
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    logger.error('删除用户失败', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

// 获取所有设备
router.get('/api/admin/devices', (req, res) => {
  try {
    const data = dataStore.getData();
    const devices = data.devices || [];
    
    res.json({ 
      success: true, 
      devices: devices.map(d => ({
        id: d.id,
        name: d.name || `设备 ${d.id}`,
        type: d.type || '未知',
        status: d.status || '未知'
      }))
    });
    
    logger.info(`管理员 ${req.user.username} 获取设备列表，返回 ${devices.length} 个设备`);
  } catch (error) {
    logger.error('获取设备列表失败', error);
    res.status(500).json({ success: false, message: '获取设备列表失败' });
  }
});

// 获取所有权限分配
router.get('/api/admin/permissions', async (req, res) => {
  try {
    // 获取权限数据，包括用户和设备信息
    const [permissions] = await pool.query(`
      SELECT 
        p.user_id AS userId,
        u.username,
        p.device_id AS deviceId,
        p.created_at
      FROM 
        device_permissions p
      JOIN 
        users u ON p.user_id = u.id
      ORDER BY
        u.username, p.device_id
    `);
    
    // 获取设备名称
    const data = dataStore.getData();
    const devices = data.devices || [];
    
    // 合并设备名称到权限数据
    const result = permissions.map(perm => {
      const device = devices.find(d => d.id === perm.deviceId);
      return {
        ...perm,
        deviceName: device ? (device.name || `设备 ${perm.deviceId}`) : `未知设备 (${perm.deviceId})`
      };
    });
    
    res.json({ success: true, permissions: result });
    logger.info(`管理员 ${req.user.username} 获取权限列表，返回 ${result.length} 条权限记录`);
  } catch (error) {
    logger.error('获取权限列表失败', error);
    res.status(500).json({ success: false, message: '获取权限列表失败' });
  }
});

// 分配设备权限
router.post('/api/admin/permissions', async (req, res) => {
  try {
    const { userId, deviceId } = req.body;
    
    // 验证输入
    if (!userId || !deviceId) {
      return res.status(400).json({ success: false, message: '用户ID和设备ID不能为空' });
    }
    
    // 检查用户是否存在
    const [users] = await pool.query('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 检查设备是否存在
    const data = dataStore.getData();
    const device = (data.devices || []).find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: '设备不存在' });
    }
    
    // 检查权限是否已存在
    const [existing] = await pool.query(
      'SELECT id FROM device_permissions WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '该用户已有此设备的权限' });
    }
    
    // 添加权限
    await pool.query(
      'INSERT INTO device_permissions (user_id, device_id) VALUES (?, ?)',
      [userId, deviceId]
    );
    
    res.json({ success: true, message: '权限分配成功' });
    logger.info(`管理员 ${req.user.username} 为用户 ${users[0].username} 分配了设备 ${deviceId} 的权限`);
  } catch (error) {
    logger.error('分配权限失败', error);
    res.status(500).json({ success: false, message: '分配权限失败' });
  }
});

// 移除设备权限
router.delete('/api/admin/permissions/:userId/:deviceId', async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    
    // 检查权限是否存在
    const [existing] = await pool.query(
      'SELECT p.id, u.username FROM device_permissions p JOIN users u ON p.user_id = u.id WHERE p.user_id = ? AND p.device_id = ?',
      [userId, deviceId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '权限不存在' });
    }
    
    // 移除权限
    await pool.query(
      'DELETE FROM device_permissions WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
    
    res.json({ success: true, message: '权限已移除' });
    logger.info(`管理员 ${req.user.username} 移除了用户 ${existing[0].username} 对设备 ${deviceId} 的权限`);
  } catch (error) {
    logger.error('移除权限失败', error);
    res.status(500).json({ success: false, message: '移除权限失败' });
  }
});

module.exports = router;