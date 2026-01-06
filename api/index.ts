// Entry point para Vercel Serverless Functions
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';

// Handler para Vercel - convierte Express app a función serverless
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Convertir Vercel request/response a Express format
  const expressReq = req as any;
  const expressRes = res as any;
  
  // Ejecutar la app Express
  app(expressReq, expressRes);
}

