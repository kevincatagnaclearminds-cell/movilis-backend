const { Pool } = require('pg');

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5433,
  database: process.env.PG_DATABASE || 'movilis_bd',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

// Verificar conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL:', err.message);
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const dbInfo = await client.query('SELECT current_database() as db_name');
    console.log('✅ PostgreSQL conectado correctamente');
    console.log(`📦 Base de datos: ${dbInfo.rows[0].db_name}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection };

