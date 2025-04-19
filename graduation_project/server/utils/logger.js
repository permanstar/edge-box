const util = require('util');

// 日志级别
const LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',  // 添加WARN级别
  ERROR: 'ERROR'
};

// 在控制台输出带时间戳和级别的日志
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  let formattedMessage = message;
  
  if (args.length > 0) {
    // 处理对象参数，格式化为字符串
    const formattedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }
      return typeof arg === 'object' ? util.inspect(arg, { depth: null }) : arg;
    });
    
    formattedMessage += ' ' + formattedArgs.join(' ');
  }
  
  console.log(`[${level}] ${timestamp} - ${formattedMessage}`);
}

module.exports = {
  debug: (message, ...args) => log(LEVELS.DEBUG, message, ...args),
  info: (message, ...args) => log(LEVELS.INFO, message, ...args),
  warn: (message, ...args) => log(LEVELS.WARN, message, ...args),  // 添加warn方法
  error: (message, ...args) => log(LEVELS.ERROR, message, ...args)
};