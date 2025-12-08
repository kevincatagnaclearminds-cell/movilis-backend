import { Pool, PoolClient } from 'pg';

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5433', 10),
  database: process.env.PG_DATABASE || 'movilis_bd',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

// Verificar conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err: Error) => {
  console.error('❌ Error en PostgreSQL:', err.message);
});

// Función para probar la conexión
export const testConnection = async (): Promise<boolean> => {
  try {
    const client: PoolClient = await pool.connect();
    const dbInfo = await client.query('SELECT current_database() as db_name');
    console.log('✅ PostgreSQL conectado correctamente');
    console.log(`📦 Base de datos: ${dbInfo.rows[0].db_name}`);
    client.release();
    return true;
  } catch (error) {
    const err = error as Error;
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    return false;
  }
};

export { pool };

