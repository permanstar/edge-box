/**
 * 模拟数据生成器
 */
const config = require('../config');
const logger = require('../utils/logger');

class DataGenerator {
  constructor() {
    this.devices = [];
    this.setupDevices();
  }
  
  /**
   * 设置模拟设备
   */
  setupDevices() {
    // 为每种设备类型创建指定数量的设备
    config.DEVICES.forEach(deviceType => {
      for (let i = 0; i < deviceType.count; i++) {
        // 为每个设备生成一个随机初始值
        const initialValue = this.getRandomValue(
          deviceType.minValue,
          deviceType.maxValue
        );
        
        // 创建设备对象
        const device = {
          id: `${config.DEVICE_ID_PREFIX}-${deviceType.type}-${i + 1}`,
          name: `${deviceType.type.charAt(0).toUpperCase() + deviceType.type.slice(1)} Sensor ${i + 1}`,
          type: deviceType.type,
          value: initialValue,
          unit: deviceType.unit,
          minValue: deviceType.minValue,
          maxValue: deviceType.maxValue,
          variance: deviceType.variance,
          status: 'online',
          lastUpdate: Date.now(),
          updateInterval: deviceType.updateInterval
        };
        
        this.devices.push(device);
        logger.info(`已创建模拟设备: ${device.id} (${device.name})`);
      }
    });
    
    logger.info(`总共创建了 ${this.devices.length} 个模拟设备`);
  }
  
  /**
   * 获取所有设备的当前状态
   */
  getAllDevices() {
    return this.devices;
  }
  
  /**
   * 更新所有设备的数据
   */
  updateDeviceData() {
    const now = Date.now();
    
    // 更新每个设备的值
    this.devices.forEach(device => {
      // 检查是否需要更新（根据设备自己的更新间隔）
      if (now - device.lastUpdate >= device.updateInterval) {
        // 计算新的数值（在当前值附近波动）
        const newValue = this.getNextValue(device);
        
        // 模拟随机设备故障
        if (config.SIMULATE_FAILURES && Math.random() < config.FAILURE_PROBABILITY) {
          device.status = 'error';
          logger.warn(`设备 ${device.id} 发生故障`);
        } else {
          // 如果之前是故障状态，恢复为在线状态
          if (device.status === 'error') {
            logger.info(`设备 ${device.id} 已恢复正常`);
          }
          device.status = 'online';
        }
        
        // 更新设备数据
        device.value = newValue;
        device.lastUpdate = now;
      }
    });
    
    return this.devices;
  }
  
  /**
   * 生成指定范围内的随机值
   * @param {number} min 最小值
   * @param {number} max 最大值
   * @returns {number} 随机值
   */
  getRandomValue(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  /**
   * 生成设备的下一个数值
   * @param {Object} device 设备对象
   * @returns {number} 新的数值
   */
  getNextValue(device) {
    // 在当前值附近生成波动
    const variation = (Math.random() - 0.5) * 2 * device.variance;
    let newValue = device.value + variation;
    
    // 确保新值在有效范围内
    newValue = Math.max(device.minValue, Math.min(device.maxValue, newValue));
    
    // 根据设备类型保留适当的小数位
    if (device.type === 'temperature') {
      newValue = parseFloat(newValue.toFixed(1));
    } else if (device.type === 'humidity') {
      newValue = parseFloat(newValue.toFixed(1));
    } else if (device.type === 'light') {
      newValue = Math.round(newValue);
    } else if (device.type === 'pressure') {
      newValue = parseFloat(newValue.toFixed(1));
    }
    
    return newValue;
  }
  
  /**
   * 模拟设备重启
   * @param {string} deviceId 设备ID
   */
  restartDevice(deviceId) {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.status = 'restarting';
      logger.info(`设备 ${deviceId} 正在重启...`);
      
      // 模拟重启过程
      setTimeout(() => {
        device.status = 'online';
        logger.info(`设备 ${deviceId} 已完成重启`);
      }, 5000);
      
      return true;
    }
    return false;
  }
}

module.exports = new DataGenerator();