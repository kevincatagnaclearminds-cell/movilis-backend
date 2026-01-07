// Configurar SSL para Supabase (permite certificados auto-firmados)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config'; // Asegurar que las variables de entorno se carguen
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  const errorMsg = 'DATABASE_URL no está definida en las variables de entorno';
  console.error('❌ ERROR:', errorMsg);
  console.error('💡 Verifica que DATABASE_URL esté configurada en Vercel: Settings → Environment Variables');
  
  // En Vercel, no crashear inmediatamente, permitir que la app se inicie
  // pero las queries a la DB fallarán con un error claro
  if (process.env.VERCEL) {
    console.warn('⚠️ [Vercel] Continuando sin DATABASE_URL - las queries fallarán');
    DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy'; // URL dummy para evitar crash
  } else {
    throw new Error(errorMsg);
  }
}

// Limpiar y validar DATABASE_URL
// Remover comillas si las hay (pueden venir del .env)
DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');

// Si la URL no tiene parámetros, agregar sslmode=require
// Si ya tiene parámetros pero no sslmode, agregarlo
if (!DATABASE_URL.includes('?')) {
  DATABASE_URL += '?sslmode=require';
} else if (!DATABASE_URL.includes('sslmode=')) {
  DATABASE_URL += '&sslmode=require';
}

// Validar que la URL tenga el formato correcto
if (!DATABASE_URL.match(/^postgresql:\/\/.+\/.+/)) {
  console.warn('⚠️ [Database] La URL parece estar incompleta. Debe incluir el nombre de la base de datos después del puerto.');
}

// Log de configuración (sin mostrar el password completo)
if (process.env.VERCEL) {
  const urlParts = DATABASE_URL.split('@');
  const safeUrl = urlParts.length > 1 ? `postgresql://postgres:***@${urlParts[1]}` : '***';
  console.log('🔌 [Database] URL configurada:', safeUrl);
  console.log('🔌 [Database] Host:', DATABASE_URL.match(/@([^:]+)/)?.[1] || 'N/A');
}

// Log de configuración (sin mostrar el password completo)
if (process.env.VERCEL) {
  const urlParts = DATABASE_URL.split('@');
  const safeUrl = urlParts.length > 1 ? `postgresql://postgres:***@${urlParts[1]}` : '***';
  console.log('🔌 [Database] URL configurada:', safeUrl);
}

// Configurar pool de PostgreSQL con SSL para Supabase
// Supabase requiere SSL pero acepta certificados auto-firmados
// En serverless (Vercel), usar configuración optimizada
const poolConfig: pg.PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Configuración para serverless
  max: process.env.VERCEL ? 1 : 10, // En serverless, usar solo 1 conexión
  idleTimeoutMillis: process.env.VERCEL ? 30000 : 300000, // Cerrar conexiones inactivas rápido en serverless
  connectionTimeoutMillis: process.env.VERCEL ? 15000 : 10000 // Timeout más largo para dar tiempo a establecer conexión
};

const pool = new pg.Pool(poolConfig);

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Manejar errores de conexión
prisma.$on('error' as never, (e: Error) => {
  console.error('❌ [Prisma] Error de conexión:', e.message);
});

// En serverless, conectar solo cuando sea necesario
if (process.env.VERCEL) {
  // No conectar automáticamente en serverless
  // Se conectará cuando se haga la primera query
}

// 3. Manejo de cierre (opcional, pero buena práctica)
const globalForPrisma = global as unknown as { prisma: typeof prisma };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;