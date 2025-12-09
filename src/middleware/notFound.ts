import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`) as ErrorWithStatus;
  error.statusCode = 404;
  next(error);
};

export default notFound;


