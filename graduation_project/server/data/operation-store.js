/**
 * 操作记录存储模块
 */
class OperationStore {
  constructor() {
    this.operations = new Map();
  }
  
  /**
   * 添加操作记录
   * @param {string} operationId 操作ID
   * @param {Object} operationData 操作数据
   */
  addOperation(operationId, operationData) {
    this.operations.set(operationId, {
      ...operationData,
      timestamp: Date.now()
    });
    
    // 清理旧记录
    this.cleanupOldOperations();
  }
  
  /**
   * 更新操作记录
   * @param {string} operationId 操作ID
   * @param {Object} updateData 更新数据
   */
  updateOperation(operationId, updateData) {
    if (!this.operations.has(operationId)) return;
    
    const operation = this.operations.get(operationId);
    this.operations.set(operationId, {
      ...operation,
      ...updateData,
      lastUpdated: Date.now()
    });
  }
  
  /**
   * 获取操作记录
   * @param {string} operationId 操作ID
   * @returns {Object|null} 操作记录或null
   */
  getOperation(operationId) {
    return this.operations.get(operationId) || null;
  }
  
  /**
   * 清理旧的操作记录 (保留最近24小时的)
   */
  cleanupOldOperations() {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [id, operation] of this.operations.entries()) {
      if (operation.timestamp < twentyFourHoursAgo) {
        this.operations.delete(id);
      }
    }
  }
}

// 导出单例实例
module.exports = new OperationStore();