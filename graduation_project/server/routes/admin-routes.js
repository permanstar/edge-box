const express = require('express');
const router = express.Router();
const { authenticateUser, requireAdmin } = require('../middlewares/auth-middleware');
const logger = require('../utils/logger');
const dataStore = require('../data/data-store');
const { pool } = require('../database/db');
const permissionController = require('../controllers/permission-controller'); // 添加此行

// 应用管理员权限中间件
router.use(authenticateUser, requireAdmin);

// 获取所有用户
router.get('/api/admin/users', async (req, res) => {
    try {
        // 检查是否有管理员权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '需要管理员权限' });
        }
        
        // 查询所有用户
        const [users] = await pool.query(
            'SELECT id, username, role, created_at, last_login FROM users ORDER BY id'
        );
        
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        logger.error('获取用户列表失败', error);
        res.status(500).json({ success: false, message: '获取用户列表失败' });
    }
});

// 创建新用户
router.post('/api/admin/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }
        
        // 检查角色值
        if (role && !['admin', 'user'].includes(role)) {
            return res.status(400).json({ success: false, message: '无效的角色值' });
        }
        
        // 查询用户名是否已存在
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsers.length > 0) {
            logger.warn(`尝试创建已存在的用户名: ${username}`);
            return res.status(409).json({ success: false, message: '用户名已存在' });
        }
        
        // 加密密码
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 插入新用户
        const [result] = await pool.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role || 'user']
        );
        
        // 插入成功后记录日志
        logger.info(`管理员 ${req.user.username} 创建了新用户: ${username}`);
        
        res.status(201).json({
            success: true,
            message: '用户创建成功',
            userId: result.insertId
        });
    } catch (error) {
        // 使用更详细的错误处理，特别是针对重复键错误
        if (error.code === 'ER_DUP_ENTRY') {
            logger.error(`创建用户失败，用户名已存在: ${req.body.username}`);
            return res.status(409).json({ success: false, message: '用户名已存在' });
        } else {
            logger.error('创建用户失败', error);
            return res.status(500).json({ success: false, message: '创建用户失败，服务器错误' });
        }
    }
});

// 修改用户角色
router.put('/api/admin/users/:userId/role', requireAdmin, permissionController.updateUserRole);

// 删除用户
router.delete('/api/admin/users/:userId', requireAdmin, permissionController.deleteUser);

// 清除用户所有设备权限
router.delete('/api/admin/users/:userId/permissions', requireAdmin, permissionController.clearUserPermissionsController);

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

// 测试路由 - 仅开发环境使用
if (process.env.NODE_ENV !== 'production') {
    router.get('/api/admin/test-create-user', async (req, res) => {
        try {
            const testUsername = 'testuser_' + Date.now();
            const testPassword = 'password123';
            
            // 加密密码
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            
            // 插入新用户
            const [result] = await pool.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [testUsername, hashedPassword, 'user']
            );
            
            res.json({
                success: true,
                message: '测试用户创建成功',
                user: {
                    id: result.insertId,
                    username: testUsername,
                    role: 'user'
                }
            });
        } catch (error) {
            console.error('测试创建用户失败:', error);
            res.status(500).json({ success: false, message: '测试创建用户失败', error: error.message });
        }
    });
}

module.exports = router;