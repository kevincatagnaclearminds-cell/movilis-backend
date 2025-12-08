const mongoose = require('mongoose');
const config = require('./config');

// Desactivar el modo debug de Mongoose para evitar logs excesivos
mongoose.set('debug', false);

// Configurar eventos ANTES de cualquier conexión para evitar logs de error
// Esto previene que se muestren stack traces largos cuando MongoDB no está disponible
mongoose.connection.on('error', () => {
  // Silenciar errores de conexión - ya los manejamos en connectDatabase
  // No mostrar stack traces
});

mongoose.connection.on('disconnected', () => {
  // Solo mostrar si estaba conectado antes (readyState 2 = disconnecting)
  if (mongoose.connection.readyState === 2) {
    console.log('⚠️ MongoDB desconectado');
  }
});

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000, // Timeout de 2 segundos
      socketTimeoutMS: 2000,
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    return true;
  } catch (error) {
    // Solo mostrar mensaje simple, no el stack trace completo
    const errorMsg = error.message || 'Conexión rechazada';
    const shortMsg = errorMsg.split(',')[0].trim();
    console.warn('⚠️ MongoDB no disponible:', shortMsg);
    console.warn('⚠️ La aplicación continuará sin MongoDB. Los certificados se obtendrán desde PostgreSQL.');
    return false;
  }
};

// Función para verificar si MongoDB está conectado
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDatabase, isMongoConnected };
