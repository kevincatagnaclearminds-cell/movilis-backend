const app = require('./app');
const config = require('./config/config');
const { connectDatabase } = require('./config/database');

// Conectar a la base de datos
connectDatabase();

// Iniciar servidor
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Entorno: ${config.env}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

