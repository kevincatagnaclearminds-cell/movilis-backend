const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');

// Importar rutas
const authRoutes = require('./modules/auth/routes/auth.routes');
const certificateRoutes = require('./modules/certificates/routes/certificate.routes');
const userRoutes = require('./modules/users/routes/user.routes');

// Importar middleware de errores
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Middleware de seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigin || '*',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Health check - en /api/health como espera el frontend
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/certificados', certificateRoutes);  // Cambiado a español como espera el frontend
app.use('/api/users', userRoutes);

// Middleware de errores (debe ir al final)
app.use(notFound);
app.use(errorHandler);

module.exports = app;

