/**
 * 数据存储模块
 */
class DataStore {
  constructor() {
    this.latestData = {};
  }
  
  /**
   * 获取最新数据
   * @returns {Object} 最新的数据
   */
  getData() {
    return this.latestData;
  }
  
  /**
   * 更新数据
   * @param {Object} data 新数据
   */
  updateData(data) {
    this.latestData = data;
  }
  
  /**
   * 查找设备
   * @param {string} deviceId 设备ID
   * @returns {Object|null} 找到的设备或null
   */
  findDevice(deviceId) {
    return this.latestData.devices?.find(d => d.id === deviceId) || null;
  }
}

// 导出单例实例
module.exports = new DataStore();