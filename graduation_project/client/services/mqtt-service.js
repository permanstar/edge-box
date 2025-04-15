const mqtt = require('mqtt');
const config = require('../config');
const logger = require('../utils/logger');
const dataService = require('./data-service');
const dbService = require('./db-service'); // 引入数据库服务

/**
 * MQTT服务模块
 */
class MqttService {
  constructor() {
    this.client = null;
    this.data = null;
    this.dataInterval = null;
  }
  
  /**
   * 初始化MQTT服务
   * @param {Object} initialData 初始数据
   */
  async init(initialData) {
    this.data = initialData;
    
    // 初始化数据库
    await dbService.init();
    
    // 保存初始数据到数据库
    await dbService.saveData(initialData);
    
    // 连接MQTT代理
    this.client = mqtt.connect(config.MQTT_BROKER_URL);
    
    this.client.on('connect', () => {
      logger.info(`已连接到MQTT代理 ${config.MQTT_BROKER_URL}`);
      
      // 订阅命令主题
      this.client.subscribe(config.MQTT_COMMANDS_TOPIC, (err) => {
        if (err) {
          logger.error('订阅命令主题失败', err);
        } else {
          logger.info(`已订阅MQTT主题: ${config.MQTT_COMMANDS_TOPIC}`);
        }
      });
      
      // 开始定期发送数据
      this.startDataPublishing();
    });
    
    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });
    
    this.client.on('error', (err) => {
      logger.error('MQTT客户端错误', err);
    });
  }
  
  /**
   * 开始定期发送数据
   */
  startDataPublishing() {
    // 清除可能存在的旧定时器
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }
    
    // 设置新的定时器
    this.dataInterval = setInterval(async () => {
      try {
        // 生成新的模拟数据
        this.data = dataService.generateMockData(this.data);
        
        // 保存数据到文件
        await dataService.saveData(this.data);
        
        // 保存数据到数据库
        await dbService.saveData(this.data);
        
        // 发布数据到MQTT主题
        this.client.publish(config.MQTT_TOPIC, JSON.stringify(this.data));
        logger.debug('数据已发布到MQTT主题');
      } catch (error) {
        logger.error('发布数据时出错', error);
      }
    }, config.UPDATE_INTERVAL);
    
    logger.info(`数据发布服务已启动，间隔: ${config.UPDATE_INTERVAL}ms`);
  }
  
  /**
   * 处理接收到的消息
   * @param {string} topic 主题
   * @param {Buffer} message 消息
   */
  handleMessage(topic, message) {
    if (topic === config.MQTT_COMMANDS_TOPIC) {
      try {
        const command = JSON.parse(message.toString());
        logger.info(`收到命令: ${JSON.stringify(command)}`);
        
        if (command.type === 'toggle' && command.deviceId) {
          this.handleToggleCommand(command);
        }
      } catch (error) {
        logger.error('处理命令消息时出错', error);
      }
    }
  }
  
  /**
   * 处理设备切换命令
   * @param {Object} command 命令对象
   */
  handleToggleCommand(command) {
    const device = dataService.findDevice(this.data, command.deviceId);
    
    if (!device) {
      logger.error(`找不到设备: ${command.deviceId}`);
      this.sendCommandResponse({
        success: false,
        message: '设备未找到',
        commandId: command.id,
        deviceId: command.deviceId
      });
      return;
    }
    
    // 更新设备状态
    device.status = command.targetStatus;
    if (device.status === 'offline') {
      device.value = null;
    }
    
    logger.info(`设备 ${command.deviceId} 状态已更新为 ${command.targetStatus}`);
    
    // 立即保存到数据库
    dbService.saveData(this.data).catch(err => {
      logger.error('保存设备状态变更到数据库失败', err);
    });
    
    // 发送命令响应
    this.sendCommandResponse({
      success: true,
      message: `设备已${command.targetStatus === 'online' ? '打开' : '关闭'}`,
      commandId: command.id,
      deviceId: command.deviceId,
      status: command.targetStatus
    });
  }
  
  /**
   * 发送命令响应
   * @param {Object} response 响应对象
   */
  sendCommandResponse(response) {
    if (this.client && this.client.connected) {
      this.client.publish(config.MQTT_COMMANDS_RESPONSE_TOPIC, JSON.stringify(response));
      logger.debug(`命令响应已发送: ${JSON.stringify(response)}`);
    }
  }
  
  /**
   * 断开MQTT连接
   */
  disconnect() {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }
    
    if (this.client) {
      this.client.end(true);
      logger.info('MQTT客户端已断开连接');
    }
    
    // 关闭数据库连接
    dbService.close();
  }
}

// 导出单例实例
module.exports = new MqttService();