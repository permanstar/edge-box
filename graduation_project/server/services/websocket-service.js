const WebSocket = require('ws');
const logger = require('../utils/logger');
const dataStore = require('../data/data-store');

/**
 * WebSocket服务模块
 */
class WebSocketService {
  constructor() {
    this.wss = null;
  }

  /**
   * 初始化WebSocket服务
   * @param {http.Server} server HTTP服务器
   * @returns {WebSocket.Server} WebSocket服务器
   */
  init(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress;
      logger.info(`新的WebSocket客户端连接: ${ip}`);
      
      // 发送最新数据给新连接的客户端
      const latestData = dataStore.getData();
      if (Object.keys(latestData).length > 0) {
        ws.send(JSON.stringify(latestData));
        logger.debug('已发送最新数据到新连接的客户端');
      }
      
      // 处理客户端消息
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          logger.debug(`收到WebSocket客户端消息: ${JSON.stringify(data)}`);
          
          // 处理不同类型的消息
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          logger.error('处理WebSocket消息时出错', error);
        }
      });
      
      // 处理连接关闭
      ws.on('close', () => {
        logger.info(`WebSocket客户端断开连接: ${ip}`);
      });
      
      // 处理错误
      ws.on('error', (error) => {
        logger.error(`WebSocket客户端错误: ${ip}`, error);
      });
    });
    
    return this.wss;
  }
  
  /**
   * 广播数据到所有客户端
   * @param {Object} data 要广播的数据
   */
  broadcast(data) {
    if (!this.wss) {
      logger.error('无法广播：WebSocket服务器未初始化');
      return;
    }
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
  
  /**
   * 广播操作更新
   * @param {Object} operationData 操作数据
   */
  broadcastOperationUpdate(operationData) {
    if (!this.wss) {
      logger.error('无法广播操作更新：WebSocket服务器未初始化');
      return;
    }
    
    const message = {
      type: 'operation-update',
      data: operationData
    };
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
    
    logger.debug(`已广播操作更新: ${operationData.operationId}`);
  }
}

// 导出单例实例
module.exports = new WebSocketService();