const mqtt = require('mqtt');
const config = require('../config');
const logger = require('../utils/logger');
const dataService = require('./data-service');
const dbService = require('./db-service'); // 保留数据库服务引用

/**
 * MQTT服务模块 - 负责数据传输和持久化
 */
class MqttService {
  constructor() {
    this.client = null;
    this.commandQueue = []; // 命令队列
    this.isProcessingCommands = false; // 命令处理状态标记
  }
  
  /**
   * 初始化MQTT服务
   * @param {Object} initialData 初始数据
   */
  async init(initialData) {
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
      
      // 注册为DataService的数据监听器
      dataService.addDataListener(this.onDataReceived.bind(this));
    });
    
    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });
    
    this.client.on('error', (err) => {
      logger.error('MQTT客户端错误', err);
    });
  }
  
  /**
   * 接收来自DataService的数据并处理
   * @param {Object} data 设备数据
   */
  async onDataReceived(data) {
    if (!this.client || !this.client.connected) {
      logger.warn('MQTT客户端未连接，跳过数据发布');
      return;
    }
    
    try {
      // 保存数据到数据库
      await dbService.saveData(data);
      
      // 发布数据到MQTT主题
      this.client.publish(config.MQTT_TOPIC, JSON.stringify(data));
      logger.debug(`已发布数据到MQTT主题 (${data.devices?.length || 0} 个设备)`);
    } catch (error) {
      logger.error('处理和发布数据时出错', error);
    }
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
        
        // 处理常规切换命令
        if (command.type === 'toggle' && command.deviceId) {
          this.addCommandToQueue(command);
        }
        // 处理批量切换命令
        else if (command.type === 'batchToggle' && Array.isArray(command.devices)) {
          logger.info(`收到批量命令，处理 ${command.devices.length} 个设备`);
          // 将每个设备的命令添加到队列
          command.devices.forEach(deviceCommand => {
            this.addCommandToQueue({
              id: `${command.id}-${deviceCommand.deviceId}`,
              type: 'toggle',
              deviceId: deviceCommand.deviceId,
              targetStatus: deviceCommand.targetStatus,
              timestamp: command.timestamp,
              batchId: command.id // 添加批量ID以便跟踪
            });
          });
          
          // 发送批量操作已接收的响应
          this.sendBatchCommandResponse({
            commandId: command.id,
            timestamp: Date.now(),
            message: `已接收批量操作请求，共 ${command.devices.length} 个设备`,
            status: 'processing'
          });
        }
      } catch (error) {
        logger.error('处理命令消息时出错', error);
      }
    }
  }
  
  /**
   * 将命令添加到队列并开始处理
   * @param {Object} command 命令对象
   */
  addCommandToQueue(command) {
    // 添加时间戳，用于记录命令何时被加入队列
    const commandWithTimestamp = {
      ...command,
      queuedAt: Date.now()
    };
    
    logger.debug(`命令已加入队列: ${command.id}, 设备: ${command.deviceId}`);
    this.commandQueue.push(commandWithTimestamp);
    
    // 如果不在处理命令，则开始处理
    if (!this.isProcessingCommands) {
      this.processCommandQueue();
    }
  }
  
  /**
   * 处理命令队列
   */
  async processCommandQueue() {
    // 如果队列为空或已在处理中，则退出
    if (this.commandQueue.length === 0 || this.isProcessingCommands) {
      return;
    }
    
    this.isProcessingCommands = true;
    
    // 跟踪当前批次的所有命令 ID
    const currentBatchIds = new Set();
    const batchResults = new Map();
    
    try {
      while (this.commandQueue.length > 0) {
        // 获取队列中的第一个命令
        const command = this.commandQueue.shift();
        const queueTime = Date.now() - command.queuedAt;
        logger.debug(`开始处理队列中的命令: ${command.id}, 在队列中等待: ${queueTime}ms`);
        
        // 如果有批次ID，添加到当前批次跟踪
        if (command.batchId) {
          currentBatchIds.add(command.batchId);
        }
        
        try {
          // 处理命令 - 委托给DataService更新设备状态
          const success = dataService.updateDeviceStatus(command.deviceId, command.targetStatus);
          
          // 模拟设备操作可能需要的时间
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
          
          // 创建响应对象
          const result = {
            success: success,
            message: success ? `设备已${command.targetStatus === 'online' ? '打开' : '关闭'}` : '设备未找到',
            commandId: command.id,
            deviceId: command.deviceId,
            status: command.targetStatus
          };
          
          // 发送命令响应（除非是批量命令的一部分）
          if (!command.batchId) {
            this.sendCommandResponse(result);
          }
          
          // 如果是批处理命令的一部分，记录结果
          if (command.batchId) {
            if (!batchResults.has(command.batchId)) {
              batchResults.set(command.batchId, {
                results: [],
                total: 0
              });
            }
            
            const batchInfo = batchResults.get(command.batchId);
            batchInfo.total++;
            batchInfo.results.push({
              deviceId: command.deviceId,
              success: result.success,
              message: result.message,
              status: result.status
            });
          }
        } catch (error) {
          logger.error(`命令处理失败: ${command.id}`, error);
          
          // 如果是批处理命令的一部分，记录失败结果
          if (command.batchId) {
            if (!batchResults.has(command.batchId)) {
              batchResults.set(command.batchId, {
                results: [],
                total: 0
              });
            }
            
            const batchInfo = batchResults.get(command.batchId);
            batchInfo.total++;
            batchInfo.results.push({
              deviceId: command.deviceId,
              success: false,
              message: error.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('处理命令队列时出错', error);
    } finally {
      this.isProcessingCommands = false;
      
      // 发送所有批处理的完成响应
      for (const [batchId, batchInfo] of batchResults.entries()) {
        this.sendBatchCommandResponse({
          commandId: batchId,
          timestamp: Date.now(),
          status: 'completed',
          message: `批量操作已完成，共 ${batchInfo.total} 个设备`,
          results: batchInfo.results
        });
      }
    }
  }
  
  /**
   * 发送批量命令响应
   * @param {Object} response 响应对象
   */
  sendBatchCommandResponse(response) {
    if (this.client && this.client.connected) {
      this.client.publish(config.MQTT_BATCH_COMMANDS_RESPONSE_TOPIC || 'edge/batch-responses', 
        JSON.stringify(response));
      logger.debug(`批量命令响应已发送: ${JSON.stringify(response)}`);
    }
  }
  
  /**
   * 处理设备切换命令 (保留向后兼容)
   * @param {Object} command 命令对象
   */
  handleToggleCommand(command) {
    this.addCommandToQueue(command);
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
    // 移除数据监听
    dataService.removeDataListener(this.onDataReceived.bind(this));
    
    // 停止数据生成
    dataService.stopDataGeneration();
    
    if (this.client) {
      this.client.end(true);
      logger.info('MQTT客户端已断开连接');
    }
    
    // 关闭数据库连接 (保留数据库操作)
    dbService.close();
  }
}

// 导出单例实例
module.exports = new MqttService();