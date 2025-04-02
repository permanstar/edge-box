const dataStore = require('../data/data-store');
const mqttService = require('../services/mqtt-service');
const logger = require('../utils/logger');

// 移除循环依赖
// const { mqttClient } = require('../app');

/**
 * 设备控制器模块
 */
module.exports = {
  /**
   * 获取所有数据
   * @param {express.Request} req 请求对象
   * @param {express.Response} res 响应对象
   */
  getData: (req, res) => {
    res.json(dataStore.getData());
  },
  
  /**
   * 切换设备状态
   * @param {express.Request} req 请求对象
   * @param {express.Response} res 响应对象
   */
  toggleDevice: (req, res) => {
    const { deviceId } = req.params;
    
    // 检查设备是否存在
    const device = dataStore.findDevice(deviceId);
    
    if (!device) {
      logger.error(`设备未找到: ${deviceId}`);
      return res.status(404).json({ 
        success: false, 
        message: '设备未找到，请刷新页面后重试' 
      });
    }
    
    // 防止并发操作
    if (device.operationInProgress) {
      logger.info(`设备 ${deviceId} 正在处理其他操作`);
      return res.status(409).json({
        success: false,
        message: '该设备正在处理其他操作，请稍后再试'
      });
    }
    
    // 标记设备正在操作中
    device.operationInProgress = true;
    
    try {
      // 创建命令对象
      const command = {
        type: 'toggle',
        deviceId: deviceId,
        targetStatus: device.status === 'online' ? 'offline' : 'online',
        timestamp: Date.now()
      };
      
      // 发送命令 - 不再依赖app.js提供的mqttClient
      mqttService.sendCommand(command);
      
      logger.info(`设备 ${deviceId} 状态切换命令已发送: ${command.targetStatus}`);
      
      // 返回成功响应
      res.json({ 
        success: true, 
        message: `正在${command.targetStatus === 'online' ? '打开' : '关闭'}设备`,
        device: deviceId,
        command
      });
      
      // 设置超时，确保即使没有收到命令响应也会释放锁定
      setTimeout(() => {
        const deviceToUnlock = dataStore.findDevice(deviceId);
        if (deviceToUnlock) {
          deviceToUnlock.operationInProgress = false;
          logger.debug(`设备 ${deviceId} 操作锁定已自动释放`);
        }
      }, 5000); // 5秒超时
    } catch (error) {
      // 出错时清除设备锁定状态
      device.operationInProgress = false;
      
      logger.error(`处理设备 ${deviceId} 控制请求时出错`, error);
      
      // 返回错误
      res.status(500).json({
        success: false,
        message: '处理设备控制请求时出错'
      });
    }
  },
  
  /**
   * 获取系统状态
   * @param {express.Request} req 请求对象
   * @param {express.Response} res 响应对象
   */
  getStatus: (req, res) => {
    const data = dataStore.getData();
    res.json({
      status: Object.keys(data).length > 0 ? 'running' : 'initializing',
      time: new Date().toISOString(),
      devices: data.devices ? data.devices.length : 0
    });
  }
};