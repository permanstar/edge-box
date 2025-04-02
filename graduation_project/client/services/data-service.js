const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 数据服务模块
 */
class DataService {
  /**
   * 确保数据目录存在
   */
  async ensureDataDirectory() {
    try {
      await fs.access(config.DATA_DIRECTORY);
    } catch (error) {
      logger.info(`创建数据目录: ${config.DATA_DIRECTORY}`);
      await fs.mkdir(config.DATA_DIRECTORY, { recursive: true });
    }
  }
  
  /**
   * 获取或创建初始数据
   * @returns {Object} 初始数据
   */
  async getInitialData() {
    try {
      try {
        // 尝试读取现有数据
        const data = await fs.readFile(config.DATA_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        logger.info('成功读取现有数据');
        return parsedData;
      } catch (err) {
        // 如果文件不存在或无效，创建初始数据
        const initialData = this.createSampleData();
        await this.saveData(initialData);
        logger.info('创建并保存了初始样本数据');
        return initialData;
      }
    } catch (error) {
      logger.error('获取初始数据时出错', error);
      // 返回默认数据以防止应用程序崩溃
      return this.createSampleData();
    }
  }
  
  /**
   * 创建示例数据
   * @returns {Object} 样本数据
   */
  createSampleData() {
    return {
      timestamp: Date.now(),
      devices: [
        {
          id: 'device-001',
          name: '温度传感器 1',
          type: 'temperature',
          value: 25.5,
          unit: '°C',
          status: 'online'
        },
        {
          id: 'device-002',
          name: '湿度传感器 1',
          type: 'humidity',
          value: 60.2,
          unit: '%',
          status: 'online'
        },
        {
          id: 'device-003',
          name: '光照传感器 1',
          type: 'light',
          value: 450,
          unit: 'lux',
          status: 'online'
        }
      ],
      system: {
        cpu: 35,
        memory: 42,
        storage: 28,
        network: 'connected'
      }
    };
  }
  
  /**
   * 保存数据到文件
   * @param {Object} data 要保存的数据
   */
  async saveData(data) {
    try {
      await fs.writeFile(config.DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('保存数据时出错', error);
      throw error;
    }
  }
  
  /**
   * 生成模拟设备数据
   * @param {Object} data 当前数据
   * @returns {Object} 更新后的数据
   */
  generateMockData(data) {
    // 更新时间戳
    data.timestamp = Date.now();
    
    // 只为在线设备生成模拟数据
    data.devices.forEach(device => {
      if (device.status === 'online') {
        // 按设备类型生成模拟数据
        switch (device.type) {
          case 'temperature':
            device.value = (20 + Math.random() * 10).toFixed(1);
            break;
          case 'humidity':
            device.value = (50 + Math.random() * 30).toFixed(1);
            break;
          case 'light':
            device.value = Math.floor(300 + Math.random() * 500);
            break;
          default:
            // 其他类型传感器
            device.value = Math.floor(Math.random() * 100);
        }
      } else {
        // 对于离线设备，将值设置为 null
        device.value = null;
      }
    });
    
    // 更新系统指标
    data.system.cpu = Math.floor(20 + Math.random() * 50);
    data.system.memory = Math.floor(30 + Math.random() * 40);
    data.system.storage = Math.floor(20 + Math.random() * 40);
    
    return data;
  }
  
  /**
   * 查找设备
   * @param {Object} data 数据对象
   * @param {string} deviceId 设备ID
   * @returns {Object|null} 找到的设备或null
   */
  findDevice(data, deviceId) {
    return data.devices?.find(d => d.id === deviceId) || null;
  }
}

// 导出单例实例
module.exports = new DataService();