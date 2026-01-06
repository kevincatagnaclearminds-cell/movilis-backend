/**
 * Script para inicializar la tabla de firmas en PostgreSQL
 * NOTA: Este script ya no es necesario si usas Prisma migrations
 * Ejecutar con: ts-node src/scripts/initFirmasTable.ts
 * 
 * Para crear tablas, usa: npx prisma migrate dev
 */

import prisma from '../config/prisma';

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

type ColumnInfo = { column_name: string; data_type: string };

async function initFirmasTable(): Promise<void> {
  try {
    console.log('🔄 Creando tabla de firmas usando Prisma...');

    // Usar Prisma para ejecutar SQL raw si es necesario
    await prisma.$executeRawUnsafe(createTableSQL);
    console.log('✅ Tabla "firmas" creada correctamente');

    await prisma.$executeRawUnsafe(createIndexesSQL);
    console.log('✅ Índices creados correctamente');

    // Verificar que la tabla existe
    const result = await prisma.$queryRawUnsafe<Array<ColumnInfo>>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'firmas'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estructura de la tabla:');
    result.forEach((col) => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ ¡Tabla de firmas lista para usar!');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Error creando tabla:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void initFirmasTable();


