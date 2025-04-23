const path = require('path');

module.exports = {
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  MQTT_TOPIC: process.env.MQTT_TOPIC || 'edge/data',
  MQTT_COMMANDS_TOPIC: 'edge/commands',
  MQTT_COMMANDS_RESPONSE_TOPIC: 'edge/responses',  // 修改为与服务端一致
  MQTT_BATCH_COMMANDS_RESPONSE_TOPIC: 'edge/batch-responses',
  DATA_DIRECTORY: path.join(__dirname, '..', 'data'),
  DATA_FILE: path.join(__dirname, '..', 'data', 'sensor-data.json'),
  UPDATE_INTERVAL: 5000 // 数据更新间隔 (毫秒)
};