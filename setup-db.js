// setup-db.js -- Database initializer script
// Ritik Kumar (Roll No: 20251651078) - IIIT Vadodara
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { dbConfig } = require('./db');

async function setup() {
  console.log('🔄 Initializing Campus Library Database (MySQL)...');
  console.log(`Connecting to ${dbConfig.host}:${dbConfig.port} as '${dbConfig.user}'...`);

  let connection;
  try {
    // Connect without selecting database first to ensure database creation
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
      multipleStatements: true,
    });

    const sqlScript = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(sqlScript);

    console.log('✅ Database `gqldemo` and relational tables (authors, books) created successfully!');
    console.log('✅ Seed data successfully inserted (including Author: Ritik Kumar).');
  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    console.log('\n💡 Tip: Check your MYSQL_PASSWORD in db.js or pass via environment variable:');
    console.log('   $env:MYSQL_PASSWORD="your_password"; npm run setup-db\n');
  } finally {
    if (connection) await connection.end();
  }
}

setup();
