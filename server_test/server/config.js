const path = require('path');

module.exports = {
  // 原有配置
  PORT: process.env.PORT || 3000,
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  MQTT_TOPIC: 'edge/data',
  MQTT_COMMANDS_TOPIC: 'edge/commands',
  MQTT_COMMANDS_RESPONSE_TOPIC: 'edge/responses',
  MQTT_BATCH_COMMANDS_RESPONSE_TOPIC: 'edge/batch-responses',
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),
  
  // 新增数据库配置
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_NAME: process.env.DB_NAME || 'edge_box_db',
  
  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET || 'edge-box-jwt-secret-key',
  JWT_EXPIRES_IN: '24h',
  
  // 设备命令相关配置
  DEVICE_COMMAND: {
    RESPONSE_TIMEOUT: process.env.DEVICE_COMMAND_TIMEOUT || 10000,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000
  }
};