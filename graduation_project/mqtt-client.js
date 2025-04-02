const config = require('./client/config');
const mqttService = require('./client/services/mqtt-service');
const dataService = require('./client/services/data-service');
const logger = require('./client/utils/logger');

// 初始化服务
const init = async () => {
  try {
    // 确保数据目录存在
    await dataService.ensureDataDirectory();
    
    // 读取或创建初始数据
    const initialData = await dataService.getInitialData();
    
    // 连接MQTT并开始数据发布
    mqttService.init(initialData);
    
    logger.info('MQTT客户端启动成功');
  } catch (error) {
    logger.error('MQTT客户端初始化失败', error);
    process.exit(1);
  }
};

// 启动客户端
init();

// 处理进程退出
process.on('SIGINT', () => {
  logger.info('正在关闭MQTT客户端...');
  mqttService.disconnect();
  process.exit(0);
});