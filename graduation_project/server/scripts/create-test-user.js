const { pool } = require('../database/db');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

async function createTestUser() {
  try {
    // 检查是否已存在测试用户
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      ['testuser']
    );
    
    if (existingUsers.length > 0) {
      console.log('测试用户已存在，跳过创建');
      return;
    }
    
    // 创建测试用户
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['testuser', hashedPassword, 'user']
    );
    
    console.log('测试用户创建成功：username = testuser, password = password123');
  } catch (error) {
    console.error('创建测试用户失败:', error);
  } finally {
    // 关闭连接池
    pool.end();
  }
}

createTestUser();