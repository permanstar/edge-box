/**
 * 简单的日志工具
 */
module.exports = {
  /**
   * 记录信息日志
   * @param {string} message 日志信息
   */
  info: (message) => {
    console.log(`[CLIENT-INFO] ${new Date().toISOString()} - ${message}`);
  },
  
  /**
   * 记录错误日志
   * @param {string} message 日志信息
   * @param {Error} [error] 错误对象
   */
  error: (message, error) => {
    console.error(`[CLIENT-ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  },
  
  /**
   * 记录调试信息
   * @param {string} message 日志信息
   */
  debug: (message) => {
    console.log(`[CLIENT-DEBUG] ${new Date().toISOString()} - ${message}`);
  }
};