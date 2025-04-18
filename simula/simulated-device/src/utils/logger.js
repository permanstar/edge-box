/**
 * 日志工具
 */
const winston = require('winston');
const config = require('../config');

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

module.exports = logger;