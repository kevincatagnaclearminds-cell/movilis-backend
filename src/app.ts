import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/config';

// Importar rutas
import authRoutes from './modules/auth/routes/auth.routes';
import certificateRoutes from './modules/certificates/routes/certificate.routes';
import userRoutes from './modules/users/routes/user.routes';
import firmaRoutes from './modules/firma/routes/firma.routes';

// Importar middleware de errores
import errorHandler from './middleware/errorHandler';
import notFound from './middleware/notFound';

const app: Application = express();

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
app.use('/api/firma', firmaRoutes);

// Middleware de errores (debe ir al final)
app.use(notFound);
app.use(errorHandler);

export default app;

