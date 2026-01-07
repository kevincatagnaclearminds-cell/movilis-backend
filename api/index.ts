// Entry point para Vercel Serverless Functions
import 'dotenv/config'; // Ensure environment variables are loaded

// Importar la app de Express
import app from '../src/app';

// Log de inicialización
if (process.env.VERCEL) {
  console.log('✅ [Vercel] Backend inicializado');
  console.log('🔒 [CORS] Orígenes permitidos:', process.env.CORS_ORIGIN || 'Todos (*)');
}

// Vercel puede manejar Express apps directamente
export default app;

