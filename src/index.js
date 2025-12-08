const app = require('./app');
const config = require('./config/config');
const { testConnection } = require('./config/postgres');

// Conectar a PostgreSQL
testConnection();

// MongoDB está deshabilitado - solo usamos PostgreSQL
// Si en el futuro necesitas MongoDB, descomenta la siguiente línea:
// const { connectDatabase } = require('./config/database');
// connectDatabase().catch(() => {});

// Iniciar servidor
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Entorno: ${config.env}`);
});

// Manejo de errores no capturados (excepto MongoDB)
process.on('unhandledRejection', (err) => {
  // Si es un error de MongoDB, no crashear
  if (err && err.name && err.name.includes('Mongo')) {
    return; // Silenciar errores de MongoDB
  }
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
