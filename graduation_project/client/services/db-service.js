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
      
      // 创建设备表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          unit TEXT
        )
      `);
      
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
        
        // 更新设备信息
        const insertDevice = this.db.prepare(`
          INSERT OR REPLACE INTO devices (id, name, type, unit)
          VALUES (?, ?, ?, ?)
        `);
        
        // 插入设备数据
        const insertDeviceData = this.db.prepare(`
          INSERT INTO device_data (device_id, value, status, timestamp)
          VALUES (?, ?, ?, ?)
        `);
        
        // 处理每个设备
        for (const device of devices) {
          // 更新或插入设备信息
          insertDevice.run(device.id, device.name, device.type, device.unit);
          
          // 插入设备数据点
          insertDeviceData.run(device.id, device.value, device.status, timestamp);
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
   * 清理旧数据 (保留最近7天数据)
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
      
      logger.info(`清理旧数据完成: 已删除 ${deviceDataResult.changes} 条设备数据记录和 ${systemMetricsResult.changes} 条系统指标记录`);
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