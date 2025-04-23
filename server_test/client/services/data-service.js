const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 数据服务模块 - 负责数据生成和管理
 */
class DataService {
  constructor() {
    this.allDevices = []; // 存储所有设备数据
    this.registeredDevices = []; // 存储从数据库读取的注册设备列表
    this.dataInterval = null; // 数据生成定时器
    this.dbSyncInterval = null; // 数据库同步定时器
    this.dataListeners = []; // 数据监听器列表
  }
  
  /**
   * 确保数据目录存在
   */
  async ensureDataDirectory() {
    try {
      await fs.access(config.DATA_DIRECTORY);
    } catch (error) {
      await fs.mkdir(config.DATA_DIRECTORY, { recursive: true });
      logger.info(`创建数据目录: ${config.DATA_DIRECTORY}`);
    }
  }
  
  /**
   * 获取或创建初始数据
   * @returns {Object} 初始数据
   */
  async getInitialData() {
    try {
      await this.ensureDataDirectory();
      
      // 先从数据库同步注册设备
      try {
        await this.syncRegisteredDevices();
        logger.info(`初始化时从数据库加载了 ${this.registeredDevices.length} 个注册设备`);
      } catch (dbError) {
        logger.warn('初始化时从数据库加载注册设备失败', dbError);
      }
      
      // 读取或创建模拟数据
      try {
        // 尝试读取现有数据
        const data = await fs.readFile(config.DATA_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        logger.info('成功读取现有数据');
        this.allDevices = parsedData.devices || [];
        return parsedData;
      } catch (err) {
        // 如果文件不存在或无效，创建初始数据
        const initialData = this.createSampleData();
        await this.saveData(initialData);
        logger.info('创建并保存了初始样本数据');
        this.allDevices = initialData.devices || [];
        return initialData;
      }
    } catch (error) {
      logger.error('获取初始数据时出错', error);
      // 返回默认数据以防止应用程序崩溃
      const defaultData = this.createSampleData();
      this.allDevices = defaultData.devices || [];
      return defaultData;
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
      await this.ensureDataDirectory();
      await fs.writeFile(config.DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('保存数据时出错', error);
      throw error;
    }
  }
  
  /**
   * 开始数据模拟生成
   * @param {number} interval 生成间隔(毫秒)
   */
  startDataGeneration(interval = config.UPDATE_INTERVAL) {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }
    
    // 立即生成一次数据
    this.generateAndNotify();
    
    // 设置定时生成
    this.dataInterval = setInterval(() => {
      this.generateAndNotify();
    }, interval);
    
    // 同时启动设备同步
    this.startDeviceSyncInterval();
    
    logger.info(`数据生成服务已启动，间隔: ${interval}ms`);
  }
  
  /**
   * 停止数据生成
   */
  stopDataGeneration() {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
      logger.info('数据生成服务已停止');
    }
    
    // 同时停止设备同步
    this.stopDeviceSync();
  }
  
  /**
 * 生成数据并通知所有监听器
 */
generateAndNotify() {
  try {
    // 生成新数据
    const allData = this.generateMockData();
    
    // 保存所有数据（包括离线设备）
    this.saveData(allData).catch(err => logger.error('保存数据时出错', err));
    
    // 提取只包含在线设备的数据
    const onlineData = this.getOnlineDevicesData(allData);
    
    // 将注册设备合并到在线设备数据中
    const mergedData = this.mergeRegisteredDevicesWithOnlineData(onlineData);
    
    // 通知所有监听器（包含在线设备和离线的注册设备）
    this.notifyDataListeners(mergedData);
  } catch (error) {
    logger.error('生成和发送数据时出错', error);
  }
}

/**
 * 将注册设备合并到在线设备数据中
 * @param {Object} onlineData 在线设备数据
 * @returns {Object} 合并后的数据
 */
mergeRegisteredDevicesWithOnlineData(onlineData) {
  // 如果没有注册设备，直接返回在线设备数据
  if (!this.registeredDevices || this.registeredDevices.length === 0) {
    return onlineData;
  }
  
  // 创建在线设备ID的集合，用于快速查找
  const onlineDeviceIds = new Set(onlineData.devices.map(device => device.id));
  
  // 创建要添加的离线注册设备列表
  const offlineRegisteredDevices = [];
  
  // 遍历注册设备列表，找出不在在线设备中的设备
  this.registeredDevices.forEach(regDevice => {
    // 如果设备不在在线列表中，添加为离线设备
    if (!onlineDeviceIds.has(regDevice.id)) {
      offlineRegisteredDevices.push({
        id: regDevice.id,
        name: regDevice.name,
        type: regDevice.type,
        unit: regDevice.unit || null,
        value: null,           // 离线设备没有值
        status: 'offline',     // 标记为离线
        isRegistered: true,    // 标记为注册设备
        lastUpdated: Date.now()
      });
    }
  });
  
  // 如果有离线注册设备，添加到结果中
  if (offlineRegisteredDevices.length > 0) {
    // 创建合并数据的副本
    const mergedData = {
      ...onlineData,
      devices: [...onlineData.devices, ...offlineRegisteredDevices]
    };
    
    logger.debug(`合并了 ${onlineData.devices.length} 个在线设备和 ${offlineRegisteredDevices.length} 个离线注册设备`);
    return mergedData;
  }
  
  // 如果没有需要添加的设备，直接返回原数据
  return onlineData;
}

/**
 * 将注册设备合并到在线设备数据中
 * @param {Object} onlineData 在线设备数据
 * @returns {Object} 合并后的数据
 */
mergeRegisteredDevicesWithOnlineData(onlineData) {
  // 如果没有注册设备，直接返回在线设备数据
  if (!this.registeredDevices || this.registeredDevices.length === 0) {
    return onlineData;
  }
  
  // 创建在线设备ID的集合，用于快速查找
  const onlineDeviceIds = new Set(onlineData.devices.map(device => device.id));
  
  // 创建要添加的离线注册设备列表
  const offlineRegisteredDevices = [];
  
  // 遍历注册设备列表，找出不在在线设备中的设备
  this.registeredDevices.forEach(regDevice => {
    // 如果设备不在在线列表中，添加为离线设备
    if (!onlineDeviceIds.has(regDevice.id)) {
      offlineRegisteredDevices.push({
        id: regDevice.id,
        name: regDevice.name,
        type: regDevice.type,
        unit: regDevice.unit || null,
        value: null,           // 离线设备没有值
        status: 'offline',     // 标记为离线
        isRegistered: true,    // 标记为注册设备
        lastUpdated: Date.now()
      });
    }
  });
  
  // 如果有离线注册设备，添加到结果中
  if (offlineRegisteredDevices.length > 0) {
    // 创建合并数据的副本
    const mergedData = {
      ...onlineData,
      devices: [...onlineData.devices, ...offlineRegisteredDevices]
    };
    
    logger.debug(`合并了 ${onlineData.devices.length} 个在线设备和 ${offlineRegisteredDevices.length} 个离线注册设备`);
    return mergedData;
  }
  
  // 如果没有需要添加的设备，直接返回原数据
  return onlineData;
}
  /**
   * 生成模拟设备数据
   * @returns {Object} 更新后的数据
   */
  generateMockData() {
    const data = {
      timestamp: Date.now(),
      devices: [...this.allDevices],
      system: this.generateSystemMetrics()
    };
    
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
        // 更新最后更新时间
        device.lastUpdated = data.timestamp;
      } else {
        // 对于离线设备，将值设置为 null
        device.value = null;
      }
    });
    
    // 更新内部存储
    this.allDevices = data.devices;
    
    return data;
  }
  
  /**
   * 生成系统指标
   * @returns {Object} 系统指标
   */
  generateSystemMetrics() {
    return {
      cpu: Math.floor(20 + Math.random() * 50),
      memory: Math.floor(30 + Math.random() * 40),
      storage: Math.floor(20 + Math.random() * 40),
      network: 'connected'
    };
  }
  
  /**
   * 获取只包含在线设备的数据
   * @param {Object} allData 完整数据
   * @returns {Object} 只包含在线设备的数据
   */
  getOnlineDevicesData(allData) {
    if (!allData || !allData.devices) {
      return allData;
    }
    
    // 创建新对象，避免修改原始数据
    const onlineData = {
      timestamp: allData.timestamp,
      devices: allData.devices.filter(device => device.status === 'online'),
      system: allData.system
    };
    
    logger.debug(`在线设备: ${onlineData.devices.length}/${allData.devices.length}`);
    
    return onlineData;
  }
  
  /**
   * 将注册设备合并到在线设备数据中
   * @param {Object} onlineData 在线设备数据
   * @returns {Object} 合并后的数据
   */
  mergeRegisteredDevicesWithOnlineData(onlineData) {
    // 如果没有注册设备，直接返回在线设备数据
    if (!this.registeredDevices || this.registeredDevices.length === 0) {
      return onlineData;
    }
    
    // 创建在线设备ID的集合，用于快速查找
    const onlineDeviceIds = new Set(onlineData.devices.map(device => device.id));
    
    // 创建要添加的离线注册设备列表
    const offlineRegisteredDevices = [];
    
    // 遍历注册设备列表，找出不在在线设备中的设备
    this.registeredDevices.forEach(regDevice => {
      // 如果设备不在在线列表中，添加为离线设备
      if (!onlineDeviceIds.has(regDevice.id)) {
        offlineRegisteredDevices.push({
          id: regDevice.id,
          name: regDevice.name,
          type: regDevice.type,
          unit: regDevice.unit || null,
          value: null,           // 离线设备没有值
          status: 'offline',     // 标记为离线
          isRegistered: true,    // 标记为注册设备
          lastUpdated: Date.now()
        });
      }
    });
    
    // 如果有离线注册设备，添加到结果中
    if (offlineRegisteredDevices.length > 0) {
      // 创建合并数据的副本
      const mergedData = {
        ...onlineData,
        devices: [...onlineData.devices, ...offlineRegisteredDevices]
      };
      
      logger.debug(`合并了 ${onlineData.devices.length} 个在线设备和 ${offlineRegisteredDevices.length} 个离线注册设备`);
      return mergedData;
    }
    
    // 如果没有需要添加的设备，直接返回原数据
    return onlineData;
  }
  
  /**
   * 添加数据监听器
   * @param {Function} listener 监听器函数
   */
  addDataListener(listener) {
    if (typeof listener === 'function' && !this.dataListeners.includes(listener)) {
      this.dataListeners.push(listener);
      logger.debug('已添加数据监听器');
      return true;
    }
    return false;
  }
  
  /**
   * 移除数据监听器
   * @param {Function} listener 监听器函数
   */
  removeDataListener(listener) {
    const index = this.dataListeners.indexOf(listener);
    if (index !== -1) {
      this.dataListeners.splice(index, 1);
      logger.debug('已移除数据监听器');
      return true;
    }
    return false;
  }
  
  /**
   * 通知所有数据监听器
   * @param {Object} data 数据对象
   */
  notifyDataListeners(data) {
    this.dataListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        logger.error('执行数据监听器时出错', error);
      }
    });
  }
  
  /**
   * 更新设备状态
   * @param {string} deviceId 设备ID
   * @param {string} status 新状态
   * @returns {boolean} 是否成功更新
   */
  updateDeviceStatus(deviceId, status) {
    const device = this.findDevice(deviceId);
    
    if (!device) {
      logger.error(`找不到设备: ${deviceId}`);
      return false;
    }
    
    device.status = status;
    const now = Date.now();
    
    // 根据状态设置额外属性
    if (status === 'offline') {
      device.value = null;
      device.lastOfflineTime = now;
    } else {
      device.lastOnlineTime = now;
    }
    
    device.lastUpdated = now;
    
    // 立即生成并发送更新后的数据
    this.generateAndNotify();
    
    return true;
  }
  
  /**
   * 查找设备
   * @param {string} deviceId 设备ID
   * @returns {Object|null} 找到的设备或null
   */
  findDevice(deviceId) {
    return this.allDevices.find(d => d.id === deviceId) || null;
  }
  
  /**
   * 获取所有设备数据（包括离线设备）
   * @returns {Object} 完整数据
   */
  getAllDevicesData() {
    return {
      timestamp: Date.now(),
      devices: [...this.allDevices],
      system: this.generateSystemMetrics()
    };
  }

  /**
   * 从数据库同步注册设备列表
   * @returns {Promise<boolean>} 是否成功同步
   */
  async syncRegisteredDevices() {
    try {
      const dbService = require('./db-service');
      
      // 确保数据库已初始化
      if (!dbService.initialized) {
        await dbService.init();
      }
      
      // 获取所有注册设备
      const devices = dbService.getAllRegisteredDevices();
      
      if (devices && Array.isArray(devices)) {
        this.registeredDevices = devices;
        logger.info(`已从数据库同步 ${devices.length} 个注册设备`);
        return true;
      } else {
        logger.warn('从数据库获取注册设备失败或没有注册设备');
        return false;
      }
    } catch (error) {
      logger.error('同步注册设备失败', error);
      return false;
    }
  }

  /**
   * 启动定期同步注册设备
   * @param {number} interval 同步间隔 (毫秒)
   */
  startDeviceSyncInterval(interval = 60000) { // 默认每分钟同步一次
    if (this.dbSyncInterval) {
      clearInterval(this.dbSyncInterval);
    }
    
    // 立即同步一次
    this.syncRegisteredDevices();
    
    // 设置定时同步
    this.dbSyncInterval = setInterval(() => {
      this.syncRegisteredDevices();
    }, interval);
    
    logger.info(`注册设备同步服务已启动，间隔: ${interval}ms`);
  }

  /**
   * 停止注册设备同步
   */
  stopDeviceSync() {
    if (this.dbSyncInterval) {
      clearInterval(this.dbSyncInterval);
      this.dbSyncInterval = null;
      logger.info('注册设备同步服务已停止');
    }
  }

  /**
   * 获取当前注册的设备列表
   * @returns {Array} 注册设备列表
   */
  getRegisteredDevices() {
    return this.registeredDevices;
  }
}

// 导出单例实例
module.exports = new DataService();