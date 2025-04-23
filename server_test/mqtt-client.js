const config = require('./client/config');
const mqttService = require('./client/services/mqtt-service');
const dataService = require('./client/services/data-service');
const dbService = require('./client/services/db-service');
const logger = require('./client/utils/logger');

/**
 * 初始化边缘盒子客户端
 */
async function init() {
  try {
    logger.info('边缘盒子客户端启动中...');
    
    // 确保数据目录存在
    await dataService.ensureDataDirectory();
    
    // 读取或创建初始数据
    const initialData = await dataService.getInitialData();
    logger.info(`加载了 ${initialData.devices?.length || 0} 个设备的初始数据`);
    
    // 初始化MQTT服务
    await mqttService.init(initialData);
    
    // 启动数据生成服务
    dataService.startDataGeneration(config.UPDATE_INTERVAL);
    
    logger.info('边缘盒子客户端已启动并运行');
  } catch (error) {
    logger.error('边缘盒子客户端初始化失败', error);
    process.exit(1);
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  logger.info('正在关闭边缘盒子客户端...');
  mqttService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('正在关闭边缘盒子客户端...');
  mqttService.disconnect();
  process.exit(0);
});

// 启动客户端
init();