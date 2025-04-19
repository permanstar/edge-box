const { pool } = require('../database/db');
const logger = require('../utils/logger');
const dataStore = require('../data/data-store');

module.exports = {
  /**
   * 为用户分配设备权限
   */
  assignDeviceToUser: async (req, res) => {
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
  },
  
  /**
   * 移除用户的设备权限
   */
  removeDeviceFromUser: async (req, res) => {
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
  },
  
  /**
   * 获取用户的所有设备权限
   */
  getUserDevices: async (req, res) => {
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
};