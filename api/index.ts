// Entry point para Vercel Serverless Functions
import 'dotenv/config'; // Ensure environment variables are loaded
import app from '../src/app';

// Vercel puede manejar Express apps directamente
export default app;

