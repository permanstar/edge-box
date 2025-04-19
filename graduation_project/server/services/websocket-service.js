const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');
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
      try {
        // 获取cookie
        const cookies = parseCookies(req.headers.cookie || '');
        const token = cookies.auth_token;
        
        // 如果没有认证令牌，拒绝连接
        if (!token) {
          logger.info('WebSocket连接尝试没有认证令牌');
          ws.close(1008, 'Unauthorized');
          return;
        }
        
        // 验证令牌
        const user = jwt.verify(token, config.JWT_SECRET);
        ws.user = user;
        
        logger.info(`WebSocket连接已建立: ${user.username}`);
        
        // 心跳检测
        ws.isAlive = true;
        ws.on('pong', () => {
          ws.isAlive = true;
        });
        
        // 发送最新数据给新连接的客户端
        const latestData = dataStore.getData();
        if (Object.keys(latestData).length > 0) {
          ws.send(JSON.stringify(latestData));
          logger.debug('已发送最新数据到新连接的客户端');
        }
        
        // 处理消息
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
        
        // 处理关闭
        ws.on('close', () => {
          logger.info(`WebSocket连接已关闭: ${user.username || 'unknown'}`);
        });
        
        // 处理错误
        ws.on('error', (error) => {
          logger.error(`WebSocket客户端错误: ${user.username}`, error);
        });
      } catch (error) {
        logger.error('WebSocket连接认证失败', error);
        ws.close(1008, 'Invalid token');
      }
    });
    
    // 设置心跳检测间隔
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        
        ws.isAlive = false;
        ws.ping(() => {});
      });
    }, 30000);
    
    this.wss.on('close', () => {
      clearInterval(interval);
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

/**
 * 解析cookie字符串为对象
 */
function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts[1] ? parts[1].trim() : '';
    cookies[name] = value;
  });
  
  return cookies;
}

// 导出单例实例
module.exports = new WebSocketService();