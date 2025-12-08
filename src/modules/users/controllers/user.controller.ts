import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest, ApiResponse, User } from '../../../types';
import userService from '../services/user.postgres.service';

class UserController {
  // GET /api/users/profile - Obtener perfil del usuario autenticado
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      res.json({
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          createdAt: req.user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getAllUsers();
      const response: ApiResponse<User[]> = {
        success: true,
        data: users
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      const user = await userService.createUser(req.body);
      
      const response: ApiResponse<User> = {
        success: true,
        data: user,
        message: 'Usuario creado exitosamente'
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

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        });
        return;
      }
      const response: ApiResponse<User> = {
        success: true,
        data: user
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      const user = await userService.updateUser(req.params.id, req.body);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        });
        return;
      }

      const response: ApiResponse<User> = {
        success: true,
        data: user
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.deleteUser(req.params.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Usuario eliminado correctamente'
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();

