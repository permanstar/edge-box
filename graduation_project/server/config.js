const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  MQTT_TOPIC: process.env.MQTT_TOPIC || 'edge/data',
  MQTT_COMMANDS_TOPIC: 'edge/commands',
  MQTT_COMMANDS_RESPONSE_TOPIC: 'edge/commands/response',
  PUBLIC_DIR: path.join(__dirname, '..', 'public')
};