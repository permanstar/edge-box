/**
 * 工具函数模块
 */
const Utils = {
    /**
     * 防抖函数
     * @param {Function} func 要执行的函数
     * @param {number} wait 等待时间(毫秒)
     * @returns {Function} 防抖处理后的函数
     */
    debounce: function(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },
    
    /**
     * 格式化日期时间
     * @param {number} timestamp 时间戳
     * @returns {string} 格式化后的日期时间字符串
     */
    formatDateTime: function(timestamp) {
        return new Date(timestamp).toLocaleString('zh-CN');
    },
    
    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId: function() {
        return '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * 深度复制对象
     * @param {Object} obj 要复制的对象
     * @returns {Object} 复制的新对象
     */
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
};