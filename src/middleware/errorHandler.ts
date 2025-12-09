import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

const errorHandler = (err: ErrorWithStatus, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

export default errorHandler;


