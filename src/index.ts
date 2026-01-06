import app from './app';
import config from './config/config';
import { testConnection } from './config/postgres';

// Conectar a PostgreSQL via Prisma
// Solo en desarrollo local, en Vercel se conecta automáticamente
if (process.env.VERCEL !== '1') {
  testConnection().catch((err) => {
    console.error('❌ Error en conexión inicial:', err);
  });
}

// MongoDB está deshabilitado - solo usamos PostgreSQL
// Si en el futuro necesitas MongoDB, descomenta la siguiente línea:
// const { connectDatabase } = require('./config/database');
// connectDatabase().catch(() => {});

// Iniciar servidor
const PORT = config.port || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Entorno: ${config.env}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso.`);
    console.error(`💡 Solución: Cierra el proceso que usa el puerto ${PORT} o cambia el puerto en .env`);
    process.exit(1);
  } else {
    console.error('❌ Error al iniciar servidor:', err);
    process.exit(1);
  }
});

// Manejo de errores no capturados (excepto MongoDB)
process.on('unhandledRejection', (err: Error) => {
  // Si es un error de MongoDB, no crashear
  if (err && err.name && err.name.includes('Mongo')) {
    return; // Silenciar errores de MongoDB
  }
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});


