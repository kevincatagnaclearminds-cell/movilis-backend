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

// CORS - Configuración mejorada para soportar múltiples orígenes
// Leer directamente de process.env para asegurar que funcione en Vercel
const corsOriginEnv = process.env.CORS_ORIGIN || config.corsOrigin || '*';
const allowedOrigins = corsOriginEnv === '*'
  ? ['*']
  : corsOriginEnv.split(',').map(o => o.trim()).filter(o => o.length > 0);

// Log de configuración CORS
if (config.env === 'development' || process.env.VERCEL) {
  const originsDisplay = allowedOrigins.length === 1 && allowedOrigins[0] === '*' 
    ? 'Todos (*) - CORS_ORIGIN no configurado, permitiendo todos los orígenes' 
    : allowedOrigins.join(', ');
  console.log('🔒 [CORS] Orígenes permitidos:', originsDisplay);
  
  if ((!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') && process.env.VERCEL) {
    console.warn('⚠️ [CORS] CORS_ORIGIN no está configurado en Vercel. Permitiendo todos los orígenes por defecto.');
    console.warn('💡 [CORS] Para mayor seguridad, configura CORS_ORIGIN en Vercel: Settings → Environment Variables');
  }
}

// Simplificar CORS - siempre permitir todos los orígenes por defecto
// Esto asegura que funcione en Vercel sin necesidad de configurar CORS_ORIGIN
const corsOptions: cors.CorsOptions = {
  origin: true, // Permitir todos los orígenes
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

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


