// Configurar SSL para Supabase (permite certificados auto-firmados)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config'; // Asegurar que las variables de entorno se carguen
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está definida en las variables de entorno');
  console.error('💡 Verifica que DATABASE_URL esté configurada en Vercel: Settings → Environment Variables');
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Configurar pool de PostgreSQL con SSL para Supabase
// Supabase requiere SSL pero acepta certificados auto-firmados
const pool = new pg.Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// 3. Manejo de cierre (opcional, pero buena práctica)
const globalForPrisma = global as unknown as { prisma: typeof prisma };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;