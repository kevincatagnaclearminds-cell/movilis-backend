/**
 * Script para inicializar la tabla de firmas en PostgreSQL
 * Ejecutar con: node src/scripts/initFirmasTable.js
 */

const { pool } = require('../config/postgres');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS firmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_cedula VARCHAR(20) NOT NULL UNIQUE,
    nombre_certificado VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'configurada' CHECK (estado IN ('sin_configurar', 'configurada', 'expirada', 'error')),
    emisor VARCHAR(255),
    serial_number VARCHAR(255),
    archivo_encriptado TEXT NOT NULL,
    archivo_iv VARCHAR(64) NOT NULL,
    password_encriptado TEXT NOT NULL,
    password_iv VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const createIndexesSQL = `
CREATE INDEX IF NOT EXISTS idx_firmas_usuario_cedula ON firmas(usuario_cedula);
CREATE INDEX IF NOT EXISTS idx_firmas_estado ON firmas(estado);
`;

async function initFirmasTable() {
  try {
    console.log('🔄 Creando tabla de firmas...');
    
    await pool.query(createTableSQL);
    console.log('✅ Tabla "firmas" creada correctamente');
    
    await pool.query(createIndexesSQL);
    console.log('✅ Índices creados correctamente');
    
    // Verificar que la tabla existe
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'firmas'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de la tabla:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n✅ ¡Tabla de firmas lista para usar!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando tabla:', error.message);
    process.exit(1);
  }
}

initFirmasTable();

