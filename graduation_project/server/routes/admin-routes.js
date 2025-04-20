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