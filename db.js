// db.js -- MySQL Connection Pool Configuration
// Campus Library GraphQL Project - Ritik Kumar (20251651078)
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'YOUR_MYSQL_PASSWORD', // Configure your MySQL root password here or via env
  database: process.env.MYSQL_DATABASE || 'gqldemo',
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// Helper function to test database connectivity
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = pool;
module.exports.testConnection = testConnection;
module.exports.dbConfig = dbConfig;
