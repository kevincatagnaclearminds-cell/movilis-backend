import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest, ApiResponse } from '../../../types';
import authService from '../services/auth.service';

class AuthController {
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      const result = await authService.register(req.body);
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Usuario registrado exitosamente'
      };
      res.status(201).json(response);
    } catch (error) {
      const err = error as Error;
      if (err.message === 'La cédula ya está registrada') {
        res.status(409).json({
          success: false,
          error: { message: err.message }
        });
        return;
      }
      next(error);
    }
  }

  // Login solo con cédula
  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      const { cedula } = req.body;
      const result = await authService.login(cedula);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Inicio de sesión exitoso'
      };
      res.json(response);
    } catch (error) {
      const err = error as Error;
      if (err.message === 'Cédula no registrada' || err.message === 'Usuario inactivo') {
        res.status(401).json({
          success: false,
          error: { message: err.message }
        });
        return;
      }
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          id: req.user._id,
          cedula: req.user.cedula,
          name: req.user.name,
          nombre: req.user.name,
          nombreCompleto: req.user.name,
          email: req.user.email,
          correo: req.user.email,
          role: req.user.role
        }
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/logout
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        message: 'Sesión cerrada correctamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/verify
  async verify(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          valid: true,
          user: {
            id: req.user._id,
            cedula: req.user.cedula,
            name: req.user.name,
            nombre: req.user.name,
            nombreCompleto: req.user.name,
            email: req.user.email,
            correo: req.user.email
          }
        }
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();


