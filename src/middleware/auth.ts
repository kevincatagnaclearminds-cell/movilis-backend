import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { AuthRequest, User } from '../types';
import userService from '../modules/users/services/user.postgres.service';

interface JwtPayload {
  userId: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: { message: 'Token no proporcionado' }
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Token inválido' }
    });
  }
};

export const authorize = (...roles: Array<'admin' | 'user' | 'issuer'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'No autenticado' }
      });
      return;
    }

    if (!roles.includes(req.user.role as 'admin' | 'user' | 'issuer')) {
      res.status(403).json({
        success: false,
        error: { message: 'No autorizado para esta acción' }
      });
      return;
    }

    next();
  };
};


