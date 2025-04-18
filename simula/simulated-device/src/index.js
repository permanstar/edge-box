/**
 * 模拟设备主程序
 */
const config = require('./config');
const logger = require('./utils/logger');
const dataGenerator = require('./services/data-generator');
const mqttService = require('./services/mqtt-service');

// 存储设备数据发送计时器
let dataSendInterval = null;

/**
 * 初始化应用
 */
async function init() {
  try {
    logger.info('正在启动模拟设备...');
    
    // 连接MQTT
    await mqttService.connect();
    
    // 发布所有设备的初始状态
    const devices = dataGenerator.getAllDevices();
    devices.forEach(device => {
      mqttService.publishDeviceStatus(device);
    });
    
    // 启动数据发送
    startDataSending();
    
    // 设置进程退出处理
    setupGracefulShutdown();
    
    logger.info('模拟设备已启动，开始发送数据');
  } catch (error) {
    logger.error(`初始化失败: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 启动数据发送
 */
function startDataSending() {
  // 如果已存在计时器，先清除
  if (dataSendInterval) {
    clearInterval(dataSendInterval);
  }
  
  // 设置新的计时器
  dataSendInterval = setInterval(() => {
    // 更新设备数据
    const devices = dataGenerator.updateDeviceData();
    
    // 发布每个设备的数据
    devices.forEach(device => {
      mqttService.publishDeviceData(device);
      
      // 如果设备状态发生变化，也发布状态更新
      if (device.status === 'error' || device.status === 'restarting') {
        mqttService.publishDeviceStatus(device);
      }
    });
    
    logger.debug(`已发送 ${devices.length} 个设备的数据`);
  }, config.DATA_SEND_INTERVAL);
  
  logger.info(`数据发送已启动，间隔: ${config.DATA_SEND_INTERVAL}ms`);
}

/**
 * 设置优雅关闭
 */
function setupGracefulShutdown() {
  // 处理进程终止信号
  process.on('SIGTERM', async () => {
    logger.info('收到SIGTERM信号，准备关闭...');
    await shutdown();
  });
  
  process.on('SIGINT', async () => {
    logger.info('收到SIGINT信号，准备关闭...');
    await shutdown();
  });
  
  // 处理未捕获的异常
  process.on('uncaughtException', async (error) => {
    logger.error(`未捕获的异常: ${error.message}`, { stack: error.stack });
    await shutdown(1);
  });
}

/**
 * 关闭应用
 * @param {number} exitCode 退出代码
 */
async function shutdown(exitCode = 0) {
  logger.info('正在关闭模拟设备...');
  
  // 清除数据发送计时器
  if (dataSendInterval) {
    clearInterval(dataSendInterval);
    dataSendInterval = null;
  }
  
  // 将所有设备状态设置为离线并发布
  const devices = dataGenerator.getAllDevices();
  devices.forEach(device => {
    device.status = 'offline';
    mqttService.publishDeviceStatus(device);
  });
  
  // 断开MQTT连接
  await mqttService.disconnect();
  
  logger.info('模拟设备已关闭');
  process.exit(exitCode);
}

// 启动应用
init();