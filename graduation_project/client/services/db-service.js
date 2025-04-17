const path = require('path');
const fs = require('fs').promises;
const Database = require('better-sqlite3');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 数据库服务模块 - 用于存储设备历史数据
 */
class DbService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(config.DATA_DIRECTORY, 'device-history.db');
    this.initialized = false;
  }
  
  /**
   * 初始化数据库
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // 确保数据目录存在
      try {
        await fs.access(config.DATA_DIRECTORY);
      } catch (error) {
        await fs.mkdir(config.DATA_DIRECTORY, { recursive: true });
        logger.info(`创建数据目录: ${config.DATA_DIRECTORY}`);
      }
      
      // 连接数据库
      this.db = new Database(this.dbPath);
      
      // 启用外键约束
      this.db.pragma('foreign_keys = ON');
      
      // 创建设备表 - 添加 last_seen 列
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          unit TEXT,
          last_seen INTEGER
        )
      `);
      
      // 尝试为现有表添加 last_seen 列（如果表已存在但没有该列）
      try {
        this.db.exec(`ALTER TABLE devices ADD COLUMN last_seen INTEGER`);
        logger.info('为设备表添加了 last_seen 列');
      } catch (error) {
        // 列可能已经存在，忽略错误
      }
      
      // 创建数据记录表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS device_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_id TEXT NOT NULL,
          value TEXT,
          status TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        )
      `);
      
      // 创建系统状态表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS system_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cpu REAL,
          memory REAL,
          storage REAL,
          network TEXT,
          timestamp INTEGER NOT NULL
        )
      `);
      
      // 创建索引以加快查询速度
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_device_data_timestamp ON device_data(timestamp);
        CREATE INDEX IF NOT EXISTS idx_device_data_device_id ON device_data(device_id);
        CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
      `);
      
      this.initialized = true;
      logger.info('数据库初始化成功');
      
      // 设置定期清理旧数据
      setInterval(() => this.cleanupOldData(), 3600000); // 每小时清理一次
    } catch (error) {
      logger.error('初始化数据库失败', error);
      throw error;
    }
  }
  
  /**
   * 保存设备数据
   * @param {Object} data 设备和系统数据
   */
  async saveData(data) {
    if (!this.initialized || !this.db) {
      await this.init();
    }
    
    try {
      // 开始事务
      const transaction = this.db.transaction((data) => {
        const { timestamp, devices, system } = data;
        
        // 更新设备信息（分开处理，避免不必要的REPLACE）
        const getDevice = this.db.prepare(`SELECT id FROM devices WHERE id = ?`);
        const insertDevice = this.db.prepare(`
          INSERT OR IGNORE INTO devices (id, name, type, unit, last_seen)
          VALUES (?, ?, ?, ?, ?)
        `);
        const updateDevice = this.db.prepare(`
          UPDATE devices SET name = ?, type = ?, unit = ?, last_seen = ?
          WHERE id = ?
        `);
        
        // 插入设备数据
        const insertDeviceData = this.db.prepare(`
          INSERT INTO device_data (timestamp, device_id, value, status)
          VALUES (?, ?, ?, ?)
        `);
        
        // 处理每个设备
        for (const device of devices) {
          // 先检查设备是否存在
          const existingDevice = getDevice.get(device.id);
          
          // 只有在线设备才更新最后在线时间
          const lastSeenTime = device.status === 'online' ? timestamp : null;
          
          if (!existingDevice) {
            // 设备不存在，插入新设备
            insertDevice.run(device.id, device.name, device.type, device.unit, lastSeenTime);
          } else {
            // 设备存在，更新信息
            // 只有设备在线时才更新 last_seen
            updateDevice.run(
              device.name, 
              device.type, 
              device.unit, 
              device.status === 'online' ? timestamp : null,
              device.id
            );
          }
          
          // 只为在线设备插入数据点
          if (device.status === 'online') {
            insertDeviceData.run(timestamp, device.id, device.value, device.status);
          }
        }
        
        // 插入系统指标
        if (system) {
          const insertSystemMetrics = this.db.prepare(`
            INSERT INTO system_metrics (cpu, memory, storage, network, timestamp)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          insertSystemMetrics.run(
            system.cpu, 
            system.memory, 
            system.storage, 
            system.network, 
            timestamp
          );
        }
      });
      
      // 执行事务
      transaction(data);
      logger.debug(`设备数据已保存到数据库，时间戳: ${data.timestamp}`);
    } catch (error) {
      logger.error('保存设备数据到数据库失败', error);
    }
  }
  
  /**
   * 获取设备历史数据
   * @param {string} deviceId 设备ID
   * @param {number} startTime 开始时间戳
   * @param {number} endTime 结束时间戳
   * @returns {Array} 设备历史数据
   */
  getDeviceHistory(deviceId, startTime, endTime) {
    if (!this.initialized || !this.db) {
      throw new Error('数据库未初始化');
    }
    
    try {
      const query = this.db.prepare(`
        SELECT d.id as device_id, d.name, d.type, d.unit, dd.value, dd.status, dd.timestamp
        FROM device_data dd
        JOIN devices d ON dd.device_id = d.id
        WHERE dd.device_id = ? AND dd.timestamp >= ? AND dd.timestamp <= ?
        ORDER BY dd.timestamp ASC
      `);
      
      return query.all(deviceId, startTime, endTime);
    } catch (error) {
      logger.error(`获取设备 ${deviceId} 历史数据失败`, error);
      return [];
    }
  }
  
  /**
   * 获取系统指标历史数据
   * @param {number} startTime 开始时间戳
   * @param {number} endTime 结束时间戳
   * @returns {Array} 系统指标历史数据
   */
  getSystemHistory(startTime, endTime) {
    if (!this.initialized || !this.db) {
      throw new Error('数据库未初始化');
    }
    
    try {
      const query = this.db.prepare(`
        SELECT cpu, memory, storage, network, timestamp
        FROM system_metrics
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
      `);
      
      return query.all(startTime, endTime);
    } catch (error) {
      logger.error('获取系统历史数据失败', error);
      return [];
    }
  }
  
  /**
   * 获取所有注册的设备信息
   * @returns {Array} 设备列表
   */
  getAllRegisteredDevices() {
    if (!this.initialized || !this.db) {
      throw new Error('数据库未初始化');
    }
    
    try {
      const query = this.db.prepare(`
        SELECT id, name, type, unit, last_seen
        FROM devices
        ORDER BY id ASC
      `);
      
      const devices = query.all();
      logger.debug(`从数据库获取了 ${devices.length} 个注册设备`);
      return devices;
    } catch (error) {
      logger.error('获取注册设备列表失败', error);
      return [];
    }
  }
  
  /**
   * 清理旧数据 (保留最近7天数据并删除长期不活跃设备)
   */
  cleanupOldData() {
    if (!this.initialized || !this.db) return;
    
    try {
      // 计算7天前的时间戳
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      // 删除旧的设备数据
      const deleteOldDeviceData = this.db.prepare(`
        DELETE FROM device_data
        WHERE timestamp < ?
      `);
      
      const deviceDataResult = deleteOldDeviceData.run(sevenDaysAgo);
      
      // 删除旧的系统指标
      const deleteOldSystemMetrics = this.db.prepare(`
        DELETE FROM system_metrics
        WHERE timestamp < ?
      `);
      
      const systemMetricsResult = deleteOldSystemMetrics.run(sevenDaysAgo);
            
      logger.info(`清理旧数据完成: 
        - 已删除 ${deviceDataResult.changes} 条设备数据记录
        - 已删除 ${systemMetricsResult.changes} 条系统指标记录`);
    } catch (error) {
      logger.error('清理旧数据失败', error);
    }
  }
  
  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('数据库连接已关闭');
    }
  }
}

// 导出单例实例
module.exports = new DbService();