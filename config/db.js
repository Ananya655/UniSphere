/**
 * Database Configuration
 * Creates and exports a MySQL connection pool using mysql2/promise.
 * Configured for Aiven MySQL with SSL support.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

/**
 * Build SSL options for Aiven MySQL.
 * Download ca.pem from your Aiven service Overview page and set DB_SSL_CA_PATH.
 * Alternatively, paste the certificate contents into DB_SSL_CA.
 */
const getSslConfig = () => {
  const sslCaPath = process.env.DB_SSL_CA_PATH;
  const sslCaContent = process.env.DB_SSL_CA;

  if (sslCaPath) {
    return {
      ca: fs.readFileSync(path.resolve(sslCaPath)),
      rejectUnauthorized: true,
    };
  }

  if (sslCaContent) {
    return {
      ca: sslCaContent.replace(/\\n/gm, '\n'),
      rejectUnauthorized: true,
    };
  }

  // Aiven requires SSL; enable TLS (provide CA cert for full verification)
  return {
    rejectUnauthorized: true,
  };
};

// Create a connection pool for efficient database connections
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: getSslConfig(),
});

/**
 * Check whether required database environment variables are set.
 */
const isDbConfigured = () => {
  return (
    process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_PASS &&
    process.env.DB_NAME
  );
};

/**
 * Verify database connectivity on server startup.
 * Attempts a simple ping to confirm the pool is working.
 */
const testConnection = async () => {
  if (!isDbConfigured()) {
    console.log(
      'Database Connection Failed: Missing DB_HOST, DB_USER, DB_PASS, or DB_NAME in environment'
    );
    return false;
  }

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('Database Connected Successfully');
    return true;
  } catch (error) {
    console.error('Database Connection Failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection, isDbConfigured };
