/**
 * MQTT服务
 */
const mqtt = require('mqtt');
const config = require('../config');
const logger = require('../utils/logger');

class MqttService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.clientId = `simulated-device-${Math.random().toString(16).substring(2, 8)}`;
  }
  
  /**
   * 连接到MQTT代理
   */
  connect() {
    return new Promise((resolve, reject) => {
      logger.info(`正在连接到MQTT代理: ${config.MQTT_BROKER_URL}`);
      
      this.client = mqtt.connect(config.MQTT_BROKER_URL, {
        clientId: this.clientId,
        clean: true,
        reconnectPeriod: 5000
      });
      
      // 设置连接事件处理
      this.client.on('connect', () => {
        this.connected = true;
        logger.info('已成功连接到MQTT代理');
        
        // 订阅设备控制主题
        this.subscribeToControlTopics();
        
        resolve();
      });
      
      // 设置错误处理
      this.client.on('error', (error) => {
        logger.error(`MQTT连接错误: ${error.message}`);
        reject(error);
      });
      
      // 处理重连
      this.client.on('reconnect', () => {
        logger.info('正在尝试重新连接到MQTT代理...');
      });
      
      // 处理断开连接
      this.client.on('close', () => {
        this.connected = false;
        logger.info('已断开MQTT连接');
      });
      
      // 处理消息
      this.client.on('message', (topic, message) => {
        this.handleIncomingMessage(topic, message);
      });
    });
  }
  
  /**
   * 订阅设备控制主题
   */
  subscribeToControlTopics() {
    // 订阅所有设备的控制主题
    this.client.subscribe('devices/+/control', { qos: 1 }, (err) => {
      if (err) {
        logger.error(`订阅控制主题失败: ${err.message}`);
      } else {
        logger.info('已订阅设备控制主题');
      }
    });
    
    // 订阅全局控制主题
    this.client.subscribe('devices/control', { qos: 1 }, (err) => {
      if (err) {
        logger.error(`订阅全局控制主题失败: ${err.message}`);
      } else {
        logger.info('已订阅全局控制主题');
      }
    });
  }
  
  /**
   * 发布设备数据
   * @param {Object} device 设备对象
   */
  publishDeviceData(device) {
    if (!this.connected || !this.client) {
      logger.warn(`MQTT未连接，无法发布设备 ${device.id} 的数据`);
      return false;
    }
    
    const topic = `devices/${device.id}/data`;
    const message = {
      timestamp: Date.now(),
      deviceId: device.id,
      name: device.name,
      type: device.type,
      value: device.value,
      unit: device.unit,
      status: device.status
    };
    
    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) {
        logger.error(`发布设备 ${device.id} 数据失败: ${err.message}`);
        return false;
      }
    });
    
    return true;
  }
  
  /**
   * 发布设备状态
   * @param {Object} device 设备对象
   */
  publishDeviceStatus(device) {
    if (!this.connected || !this.client) {
      logger.warn(`MQTT未连接，无法发布设备 ${device.id} 的状态`);
      return false;
    }
    
    const topic = `devices/${device.id}/status`;
    const message = {
      timestamp: Date.now(),
      deviceId: device.id,
      status: device.status
    };
    
    this.client.publish(topic, JSON.stringify(message), { qos: 1, retain: true }, (err) => {
      if (err) {
        logger.error(`发布设备 ${device.id} 状态失败: ${err.message}`);
        return false;
      }
    });
    
    return true;
  }
  
  /**
   * 处理接收到的消息
   * @param {string} topic 主题
   * @param {Buffer} message 消息内容
   */
  handleIncomingMessage(topic, message) {
    try {
      const payload = JSON.parse(message.toString());
      logger.info(`收到消息: ${topic} - ${JSON.stringify(payload)}`);
      
      // 处理设备特定控制
      if (topic.match(/^devices\/(.+)\/control$/)) {
        const deviceId = topic.split('/')[1];
        this.handleDeviceControl(deviceId, payload);
      }
      // 处理全局控制
      else if (topic === 'devices/control') {
        this.handleGlobalControl(payload);
      }
    } catch (error) {
      logger.error(`处理消息失败: ${error.message}`);
    }
  }
  
  /**
   * 处理设备控制命令
   * @param {string} deviceId 设备ID
   * @param {Object} command 控制命令
   */
  handleDeviceControl(deviceId, command) {
    logger.info(`收到设备 ${deviceId} 的控制命令: ${JSON.stringify(command)}`);
    
    // 在此处理具体控制命令，根据需求扩展
    
    // 发布命令响应
    const responseTopic = `devices/${deviceId}/response`;
    const response = {
      timestamp: Date.now(),
      commandId: command.id || null,
      status: 'success',
      message: `已处理 ${command.action || 'unknown'} 命令`
    };
    
    this.client.publish(responseTopic, JSON.stringify(response), { qos: 1 });
  }
  
  /**
   * 处理全局控制命令
   * @param {Object} command 控制命令
   */
  handleGlobalControl(command) {
    logger.info(`收到全局控制命令: ${JSON.stringify(command)}`);
    
    // 在此处理全局控制命令，根据需求扩展
    
    // 发布命令响应
    const responseTopic = 'devices/global/response';
    const response = {
      timestamp: Date.now(),
      commandId: command.id || null,
      status: 'success',
      message: `已处理全局 ${command.action || 'unknown'} 命令`
    };
    
    this.client.publish(responseTopic, JSON.stringify(response), { qos: 1 });
  }
  
  /**
   * 断开MQTT连接
   */
  disconnect() {
    return new Promise((resolve) => {
      if (this.client && this.connected) {
        this.client.end(true, {}, () => {
          this.connected = false;
          logger.info('已断开MQTT连接');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new MqttService();