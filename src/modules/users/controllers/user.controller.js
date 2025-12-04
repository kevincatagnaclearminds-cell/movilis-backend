// Usar servicio con PostgreSQL
const userService = require('../services/user.postgres.service');
const { validationResult } = require('express-validator');

class UserController {
  // GET /api/users/profile - Obtener perfil del usuario autenticado
  async getProfile(req, res, next) {
    try {
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

  async getUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        });
      }
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
      }

      const user = await userService.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const user = await userService.deleteUser(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        });
      }

      res.json({
        success: true,
        message: 'Usuario eliminado correctamente'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

