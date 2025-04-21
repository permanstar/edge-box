const { pool } = require('../database/db');
const logger = require('../utils/logger');
const dataStore = require('../data/data-store');

/**
 * 为用户分配设备权限
 */
async function assignDeviceToUser(req, res) {
  try {
    const { userId, deviceId } = req.body;
    
    // 验证用户是否存在
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 验证设备是否存在
    const device = dataStore.findDevice(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: '设备不存在' });
    }
    
    // 检查权限是否已存在
    const [existingPermissions] = await pool.query(
      'SELECT * FROM device_permissions WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
    
    if (existingPermissions.length > 0) {
      return res.status(409).json({ success: false, message: '该用户已经拥有此设备的权限' });
    }
    
    // 分配权限
    await pool.query(
      'INSERT INTO device_permissions (user_id, device_id) VALUES (?, ?)',
      [userId, deviceId]
    );
    
    logger.info(`设备 ${deviceId} 已分配给用户ID ${userId}`);
    
    res.json({
      success: true,
      message: '设备权限分配成功'
    });
  } catch (error) {
    logger.error('分配设备权限时出错', error);
    res.status(500).json({ success: false, message: '分配设备权限失败' });
  }
}

/**
 * 移除用户的设备权限
 */
async function removeDeviceFromUser(req, res) {
  try {
    const { userId, deviceId } = req.params;
    
    // 移除权限
    const [result] = await pool.query(
      'DELETE FROM device_permissions WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '找不到要移除的权限' });
    }
    
    logger.info(`已移除用户ID ${userId} 对设备 ${deviceId} 的权限`);
    
    res.json({
      success: true,
      message: '设备权限已移除'
    });
  } catch (error) {
    logger.error('移除设备权限时出错', error);
    res.status(500).json({ success: false, message: '移除设备权限失败' });
  }
}

/**
 * 获取用户的所有设备权限
 */
async function getUserDevices(req, res) {
  try {
    const { userId } = req.params;
    
    // 验证用户是否存在
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 获取用户的设备权限
    const [permissions] = await pool.query(
      'SELECT device_id FROM device_permissions WHERE user_id = ?',
      [userId]
    );
    
    const deviceIds = permissions.map(p => p.device_id);
    
    res.json({
      success: true,
      userId: parseInt(userId),
      devices: deviceIds
    });
  } catch (error) {
    logger.error('获取用户设备权限时出错', error);
    res.status(500).json({ success: false, message: '获取用户设备权限失败' });
  }
}

/**
 * 更新用户角色
 */
async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // 验证角色
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的用户角色' });
    }
    
    // 检查用户是否存在
    const [users] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const user = users[0];
    let deviceCount = { count: 0 }; // 初始化默认值，避免未定义错误
    
    // 如果是将管理员降级为普通用户，需要检查是否还有其他管理员
    if (user.role === 'admin' && role === 'user') {
      const [adminCount] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        ['admin']
      );
      
      // 如果这是最后一个管理员，阻止降级
      if (adminCount[0].count <= 1) {
        return res.status(403).json({ 
          success: false, 
          message: '无法降级最后一个管理员账户，系统必须保留至少一个管理员用户' 
        });
      }
    }
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 如果用户从普通用户升级为管理员，则清除其设备绑定关系
      if (user.role === 'user' && role === 'admin') {
        logger.info(`用户 ${user.username} 从普通用户升级为管理员，正在清除设备绑定关系`);
        
        // 获取该用户绑定的设备数
        const [countResult] = await connection.query(
          'SELECT COUNT(*) as count FROM device_permissions WHERE user_id = ?',
          [userId]
        );
        deviceCount = countResult[0]; // 更新deviceCount
        
        // 删除该用户的所有设备绑定关系
        await connection.query(
          'DELETE FROM device_permissions WHERE user_id = ?',
          [userId]
        );
        
        logger.info(`已清除用户 ${user.username} 的 ${deviceCount.count} 个设备绑定关系`);
      }
      
      // 更新用户角色
      await connection.query(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, userId]
      );
      
      // 提交事务
      await connection.commit();
      
      logger.info(`管理员 ${req.user.username} 将用户 ${user.username} 的角色从 ${user.role} 修改为 ${role}`);
      
      res.json({ 
        success: true, 
        message: '用户角色更新成功',
        clearedPermissions: (user.role === 'user' && role === 'admin') ? true : false,
        permissionCount: deviceCount.count // 使用已定义的deviceCount
      });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (error) {
    logger.error('修改用户角色失败', error);
    res.status(500).json({ success: false, message: '修改用户角色失败' });
  }
}

/**
 * 清除用户所有设备权限 - API控制器
 */
async function clearUserPermissionsController(req, res) {
  try {
    const { userId } = req.params;
    
    // 验证用户是否存在
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 获取该用户绑定的设备数
    const [deviceCount] = await pool.query(
      'SELECT COUNT(*) as count FROM device_permissions WHERE user_id = ?',
      [userId]
    );
    
    // 删除该用户的所有设备绑定关系
    await pool.query(
      'DELETE FROM device_permissions WHERE user_id = ?',
      [userId]
    );
    
    logger.info(`已清除用户ID ${userId} 的 ${deviceCount[0].count} 个设备绑定关系`);
    
    res.json({
      success: true,
      message: '用户设备权限已全部清除',
      count: deviceCount[0].count
    });
  } catch (error) {
    logger.error('清除用户权限API失败', error);
    res.status(500).json({ success: false, message: '清除用户权限失败: ' + error.message });
  }
}

/**
 * 删除用户
 */
async function deleteUser(req, res) {
  try {
    const { userId } = req.params;
    
    // 检查用户是否存在
    const [users] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const userToDelete = users[0];
    
    // 如果要删除的是管理员用户，检查系统中是否还有其他管理员
    if (userToDelete.role === 'admin') {
      const [adminCount] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        ['admin']
      );
      
      // 如果这是最后一个管理员，阻止删除
      if (adminCount[0].count <= 1) {
        return res.status(403).json({ 
          success: false, 
          message: '无法删除最后一个管理员账户，系统必须保留至少一个管理员用户' 
        });
      }
    }
    
    // 执行删除操作
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    
    logger.info(`管理员 ${req.user.username} 删除了用户 ${userToDelete.username}`);
    
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    logger.error('删除用户失败', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
}

module.exports = {
  assignDeviceToUser,
  removeDeviceFromUser,
  getUserDevices,
  updateUserRole,
  clearUserPermissionsController,
  deleteUser
};