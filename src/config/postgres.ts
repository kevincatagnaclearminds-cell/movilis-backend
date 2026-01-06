import prisma from './prisma';

// Función para probar la conexión usando Prisma
export const testConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database() as current_database
    `;
    console.log('✅ PostgreSQL conectado correctamente via Prisma');
    console.log(`📦 Base de datos: ${result[0]?.current_database || 'N/A'}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    return false;
  } finally {
    // En Vercel (serverless), no desconectar para mantener la conexión
    // Solo desconectar en desarrollo local
    if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
      await prisma.$disconnect();
    }
  }
};

// Mantener compatibilidad con código que pueda usar pool (obsoleto)
// En el futuro, todo debería usar Prisma directamente
export const pool = {
  query: async () => {
    throw new Error('pool.query() está obsoleto. Por favor usa Prisma directamente.');
  }
};


