// Configurar SSL para Supabase (permite certificados auto-firmados)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cargar variables de entorno
// En Railway, las variables se cargan automáticamente, pero dotenv ayuda en desarrollo
if (process.env.NODE_ENV !== 'production' || !process.env.RAILWAY_ENVIRONMENT) {
  require('dotenv/config');
}
// Prisma Client se genera dinámicamente - el IDE puede mostrar un error pero el código compila correctamente
// Si el error persiste, regenerar con: npx prisma generate
// eslint-disable-next-line @typescript-eslint/ban-ts-comment

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  const errorMsg = 'DATABASE_URL no está definida en las variables de entorno';
  console.error('❌ ERROR:', errorMsg);
  console.error('💡 Verifica que DATABASE_URL esté configurada en Railway: Settings → Variables');
  
  // En Vercel o Railway (serverless/tradicional), no crashear inmediatamente
  // pero las queries a la DB fallarán con un error claro
  if (process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT) {
    console.warn('⚠️ Continuando sin DATABASE_URL - las queries fallarán');
    DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy'; // URL dummy para evitar crash
  } else {
    throw new Error(errorMsg);
  }
}

// Limpiar y validar DATABASE_URL
// Remover comillas si las hay (pueden venir del .env)
DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');

// En Railway, forzar IPv4 agregando parámetro a la URL si no existe
if (process.env.RAILWAY_ENVIRONMENT && !DATABASE_URL.includes('connect_timeout')) {
  const separator = DATABASE_URL.includes('?') ? '&' : '?';
  DATABASE_URL += `${separator}connect_timeout=10`;
}

// Codificar el password si tiene caracteres especiales que necesiten codificación URL
// Esto es importante para passwords con *, ., @, etc.
try {
  const urlMatch = DATABASE_URL.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/);
  if (urlMatch) {
    const [, user, password, rest] = urlMatch;
    // Si el password no está codificado y tiene caracteres especiales, codificarlo
    const decodedPassword = decodeURIComponent(password);
    if (decodedPassword === password && /[*@%]/.test(password)) {
      // El password tiene caracteres especiales y no está codificado
      const encodedPassword = encodeURIComponent(password);
      DATABASE_URL = `postgresql://${user}:${encodedPassword}@${rest}`;
      if (process.env.VERCEL) {
        console.log('🔧 [Database] Password codificado (contiene caracteres especiales)');
      }
    }
  }
} catch (error) {
  // Si hay error al procesar la URL, continuar con la original
  console.warn('⚠️ [Database] Error procesando URL, usando URL original:', (error as Error).message);
}

// Si la URL no tiene parámetros, agregar sslmode=require
// Si ya tiene parámetros pero no sslmode, agregarlo
if (!DATABASE_URL.includes('?')) {
  DATABASE_URL += '?sslmode=require';
} else if (!DATABASE_URL.includes('sslmode=')) {
  DATABASE_URL += '&sslmode=require';
}

// En Railway, agregar parámetros adicionales para mejorar la conexión
if (process.env.RAILWAY_ENVIRONMENT) {
  const separator = DATABASE_URL.includes('?') ? '&' : '?';
  // Forzar IPv4 y aumentar timeout para Railway
  if (!DATABASE_URL.includes('connect_timeout')) {
    DATABASE_URL += `${separator}connect_timeout=30`;
  }
  console.log('🔧 [Database] Configuración Railway aplicada (timeout aumentado)');
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
  const hostMatch = DATABASE_URL.match(/@([^:]+)/);
  console.log('🔌 [Database] Host:', hostMatch ? hostMatch[1] : 'N/A');
  console.log('🔌 [Database] Pool config:', { max: process.env.VERCEL ? 1 : 10, connectionTimeout: process.env.VERCEL ? 15000 : 10000 });
}

// Configurar pool de PostgreSQL con SSL para Supabase
// Supabase requiere SSL pero acepta certificados auto-firmados
// En serverless (Vercel), usar configuración optimizada
const poolConfig: pg.PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Configuración para serverless (Vercel) vs servidor tradicional (Railway)
  max: process.env.VERCEL ? 1 : 10, // En serverless, usar solo 1 conexión; en Railway, usar pool normal
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