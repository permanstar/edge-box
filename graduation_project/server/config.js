const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  
  // MQTT主题：设备数据
  MQTT_TOPIC: 'edge/data',
  
  // MQTT主题：命令
  MQTT_COMMANDS_TOPIC: 'edge/commands',
  
  // MQTT主题：命令响应
  MQTT_COMMANDS_RESPONSE_TOPIC: 'edge/responses',
  
  // MQTT主题：批量命令响应
  MQTT_BATCH_COMMANDS_RESPONSE_TOPIC: 'edge/batch-responses',
  
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),

  // 设备命令相关配置
  DEVICE_COMMAND: {
    RESPONSE_TIMEOUT: process.env.DEVICE_COMMAND_TIMEOUT || 10000, // 命令响应超时时间(毫秒)
    RETRY_COUNT: 3,      // 命令失败重试次数
    RETRY_DELAY: 1000    // 重试间隔(毫秒)
  }
};