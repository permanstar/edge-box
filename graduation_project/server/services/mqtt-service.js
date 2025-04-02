const mqtt = require('mqtt');
const WebSocket = require('ws');
const config = require('../config');
const logger = require('../utils/logger');
const dataStore = require('../data/data-store');

/**
 * MQTT服务模块
 */
class MqttService {
  constructor() {
    this.client = null;
    this.responseListeners = []; // 添加响应监听器数组
  }
  
  /**
   * 初始化MQTT客户端
   * @param {WebSocket.Server} wss WebSocket服务器
   * @returns {mqtt.MqttClient} MQTT客户端
   */
  init(wss) {
    // 连接MQTT代理
    this.client = mqtt.connect(config.MQTT_BROKER_URL);
    
    this.client.on('connect', () => {
      logger.info(`已连接到MQTT代理 ${config.MQTT_BROKER_URL}`);
      
      // 订阅数据主题
      this.client.subscribe(config.MQTT_TOPIC, (err) => {
        if (err) {
          logger.error('订阅数据主题失败', err);
        } else {
          logger.info(`已订阅MQTT主题: ${config.MQTT_TOPIC}`);
        }
      });
      
      // 订阅命令响应主题
      this.client.subscribe(config.MQTT_COMMANDS_RESPONSE_TOPIC, (err) => {
        if (err) {
          logger.error('订阅命令响应主题失败', err);
        } else {
          logger.info(`已订阅MQTT主题: ${config.MQTT_COMMANDS_RESPONSE_TOPIC}`);
        }
      });
    });
    
    this.client.on('message', (topic, message) => {
      try {
        // 为命令响应主题添加单独处理
        if (topic === config.MQTT_COMMANDS_RESPONSE_TOPIC) {
          // 通知所有响应监听器
          this.notifyResponseListeners(topic, message);
          return;
        }
        
        // 处理常规数据主题
        const data = JSON.parse(message.toString());
        logger.debug(`收到来自主题 ${topic} 的MQTT消息`);
        
        // 更新存储的数据
        dataStore.updateData(data);
        
        // 广播到WebSocket客户端
        this.broadcastToClients(wss, data);
      } catch (error) {
        logger.error('处理MQTT消息时出错', error);
      }
    });
    
    this.client.on('error', (err) => {
      logger.error('MQTT客户端错误', err);
    });
    
    return this.client;
  }
  
  /**
   * 广播数据到所有WebSocket客户端
   * @param {WebSocket.Server} wss WebSocket服务器
   * @param {Object} data 要广播的数据
   */
  broadcastToClients(wss, data) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
  
  /**
   * 发送命令到MQTT主题
   * @param {Object} command 命令对象
   */
  sendCommand(command) {
    // 使用实例变量client而不是参数
    if (!this.client) {
      throw new Error('MQTT客户端未初始化');
    }
    
    this.client.publish(config.MQTT_COMMANDS_TOPIC, JSON.stringify(command));
    logger.info(`已发送命令到主题 ${config.MQTT_COMMANDS_TOPIC}: ${JSON.stringify(command)}`);
  }
  
  /**
   * 添加响应监听器
   * @param {Function} listener 监听器函数
   */
  subscribeToResponse(listener) {
    if (typeof listener === 'function') {
      this.responseListeners.push(listener);
    }
  }
  
  /**
   * 移除响应监听器
   * @param {Function} listener 监听器函数
   */
  unsubscribeFromResponse(listener) {
    this.responseListeners = this.responseListeners.filter(l => l !== listener);
  }
  
  /**
   * 通知所有响应监听器
   * @param {string} topic 主题
   * @param {Buffer} message 消息
   */
  notifyResponseListeners(topic, message) {
    this.responseListeners.forEach(listener => {
      try {
        listener(topic, message);
      } catch (error) {
        logger.error('执行响应监听器时出错', error);
      }
    });
  }
}

// 导出单例实例
module.exports = new MqttService();