/**
 * 模拟设备配置
 */
module.exports = {
    // MQTT配置
    MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://mqtt-broker:1883',
    
    // 设备配置
    DEVICE_ID_PREFIX: process.env.DEVICE_ID_PREFIX || 'sim-device',
    
    // 模拟设备类型和数量
    DEVICES: [
      {
        type: 'temperature',
        count: parseInt(process.env.TEMPERATURE_SENSORS || '3'),
        minValue: parseFloat(process.env.TEMPERATURE_MIN || '15'),
        maxValue: parseFloat(process.env.TEMPERATURE_MAX || '35'),
        unit: '°C',
        variance: 0.5,
        updateInterval: parseInt(process.env.TEMPERATURE_INTERVAL || '5000')
      },
      {
        type: 'humidity',
        count: parseInt(process.env.HUMIDITY_SENSORS || '3'),
        minValue: parseFloat(process.env.HUMIDITY_MIN || '30'),
        maxValue: parseFloat(process.env.HUMIDITY_MAX || '80'),
        unit: '%',
        variance: 2,
        updateInterval: parseInt(process.env.HUMIDITY_INTERVAL || '5000')
      },
      {
        type: 'light',
        count: parseInt(process.env.LIGHT_SENSORS || '2'),
        minValue: parseFloat(process.env.LIGHT_MIN || '0'),
        maxValue: parseFloat(process.env.LIGHT_MAX || '1000'),
        unit: 'lux',
        variance: 50,
        updateInterval: parseInt(process.env.LIGHT_INTERVAL || '5000')
      },
      {
        type: 'pressure',
        count: parseInt(process.env.PRESSURE_SENSORS || '2'),
        minValue: parseFloat(process.env.PRESSURE_MIN || '980'),
        maxValue: parseFloat(process.env.PRESSURE_MAX || '1020'),
        unit: 'hPa',
        variance: 1,
        updateInterval: parseInt(process.env.PRESSURE_INTERVAL || '5000')
      }
    ],
    
    // 发送模拟数据的间隔时间（毫秒）
    DATA_SEND_INTERVAL: parseInt(process.env.DATA_SEND_INTERVAL || '5000'),
    
    // 是否随机模拟设备故障
    SIMULATE_FAILURES: process.env.SIMULATE_FAILURES === 'true' || false,
    FAILURE_PROBABILITY: parseFloat(process.env.FAILURE_PROBABILITY || '0.01'),
    
    // 日志级别
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  };