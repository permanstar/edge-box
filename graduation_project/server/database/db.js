const mysql = require('mysql2/promise');
const config = require('../config');

// 创建连接池
const pool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 初始化数据库
async function initDatabase() {
  try {
    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `);

    // 创建设备权限表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY (user_id, device_id)
      )
    `);

    // 检查是否存在管理员账户，如果不存在则创建默认管理员
    const [admins] = await pool.query('SELECT * FROM users WHERE role = ?', ['admin']);
    if (admins.length === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      console.log('默认管理员账户已创建，用户名：admin，密码：admin123');
    }

    const [users] = await pool.query('SELECT * FROM users WHERE role = ?', ['user']);
    if (users.length === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('user123', 10);
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['user', hashedPassword, 'user']
      );
      console.log('默认普通账户已创建，用户名：user，密码：user123');
    }
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase
};