const dataStore = require('../data/data-store');
const mqttService = require('../services/mqtt-service');
const logger = require('../utils/logger');
const operationStore = require('../data/operation-store'); // 新增依赖

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
    
    try {
      // 创建命令ID
      const commandId = `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // 创建命令对象
      const command = {
        id: commandId,
        type: 'toggle',
        deviceId: deviceId,
        targetStatus: device.status === 'online' ? 'offline' : 'online',
        timestamp: Date.now()
      };
      
      // 注册命令响应处理函数
      const responsePromise = new Promise((resolve, reject) => {
        // 设置超时
        const timeout = setTimeout(() => {
          mqttService.unsubscribeFromResponse(responseHandler);
          reject(new Error('命令响应超时'));
        }, 10000); // 10秒超时
        
        // 创建响应处理器
        const responseHandler = (topic, message) => {
          try {
            const response = JSON.parse(message.toString());
            // 检查是否是当前命令的响应
            if (response.commandId === commandId) {
              clearTimeout(timeout);
              mqttService.unsubscribeFromResponse(responseHandler);
              resolve(response);
            }
          } catch (error) {
            logger.error('解析命令响应失败', error);
          }
        };
        
        // 订阅响应
        mqttService.subscribeToResponse(responseHandler);
      });
      
      // 发送命令
      mqttService.sendCommand(command);
      logger.info(`设备 ${deviceId} 状态切换命令已发送: ${command.targetStatus}`);
      
      // 立即返回成功响应，不等待命令完成
      res.json({ 
        success: true, 
        message: `正在${command.targetStatus === 'online' ? '打开' : '关闭'}设备`,
        device: deviceId,
        command
      });
      
      // 在后台处理命令响应，不阻塞API响应
      responsePromise.then(response => {
        logger.info(`收到设备 ${deviceId} 的命令响应: ${JSON.stringify(response)}`);
        
        // 如果命令成功，更新设备状态 (边缘盒子已经更新了状态，这里只是同步)
        if (response.success) {
          // 无需手动更新设备状态，MQTT数据更新时会自动刷新
          logger.debug(`设备 ${deviceId} 状态更新成功`);
        } else {
          logger.warn(`设备 ${deviceId} 状态更新失败: ${response.message}`);
        }
      }).catch(error => {
        logger.error(`处理设备 ${deviceId} 的命令响应时出错`, error);
      });
      
    } catch (error) {
      logger.error(`处理设备 ${deviceId} 控制请求时出错`, error);
      
      // 返回错误
      res.status(500).json({
        success: false,
        message: '处理设备控制请求时出错'
      });
    }
  },
  
  /**
   * 批量切换设备状态
   * @param {express.Request} req 请求对象
   * @param {express.Response} res 响应对象
   */
  batchToggleDevices: (req, res) => {
    const { devices } = req.body;
    
    if (!Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的设备信息'
      });
    }
    
    // 限制批量操作的设备数量
    if (devices.length > 20) {
      return res.status(400).json({
        success: false,
        message: '批量操作最多支持20个设备'
      });
    }
    
    try {
      // 提取设备ID列表
      const deviceIds = devices.map(d => d.deviceId);
      
      // 验证所有设备是否存在
      const invalidDevices = [];
      deviceIds.forEach(deviceId => {
        if (!dataStore.findDevice(deviceId)) {
          invalidDevices.push(deviceId);
        }
      });
      
      // 如果有无效设备，返回错误
      if (invalidDevices.length > 0) {
        return res.status(404).json({
          success: false,
          message: '部分设备未找到',
          invalidDevices
        });
      }
      
      // 创建批量命令ID
      const commandId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // 创建批量命令对象
      const batchCommand = {
        id: commandId,
        type: 'batchToggle',
        devices: devices,
        timestamp: Date.now()
      };
      
      // 发送批量命令
      mqttService.sendBatchCommand(batchCommand);
      logger.info(`批量设备状态切换命令已发送，设备数: ${devices.length}`);
      
      // 立即返回成功响应，不等待命令完成
      res.json({ 
        success: true, 
        message: `正在批量处理 ${devices.length} 个设备`,
        devices: devices,
        command: batchCommand
      });
      
    } catch (error) {
      logger.error('处理批量设备控制请求时出错', error);
      
      // 返回错误
      res.status(500).json({
        success: false,
        message: '处理批量设备控制请求时出错'
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
  },

  /**
   * 发送命令并等待响应
   * @param {string} deviceId 设备ID
   * @param {Object} command 要发送的命令
   * @param {number} timeout 超时时间(毫秒)，默认10秒
   */
  sendCommandAndWaitResponse(deviceId, command, timeout = 10000) { // 增加到10秒
    return new Promise((resolve, reject) => {
      // 生成命令ID并存储等待响应的promise
      const commandId = generateId();
      command.id = commandId;
      
      // 设置超时处理
      const timeoutHandler = setTimeout(() => {
        // 这是错误报告的位置
        reject(new Error('命令响应超时'));
        delete this.pendingCommands[commandId];
      }, timeout);
      
      // 存储pending命令
      this.pendingCommands[commandId] = {
        resolve,
        reject,
        timeoutHandler,
        deviceId
      };
      
      // 发送命令
      this.mqtt.publish('edge/commands', JSON.stringify(command));
      
      logger.debug(`已发送命令到设备 ${deviceId}，命令ID: ${commandId}，等待响应 (超时: ${timeout}ms)`);
    });
  }
};