const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'opd_preconsult',
  user: process.env.POSTGRES_USER || 'opd_user',
  password: process.env.POSTGRES_PASSWORD || 'changeme_in_production',
});

module.exports = pool;
