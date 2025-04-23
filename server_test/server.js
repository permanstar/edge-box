const app = require('./server/app');
const config = require('./server/config');
const logger = require('./server/utils/logger');

// 启动服务器
app.server.listen(config.PORT, () => {
  logger.info(`服务器启动成功，监听端口 ${config.PORT}`);
  logger.info(`MQTT代理服务器: ${config.MQTT_BROKER_URL}`);
});