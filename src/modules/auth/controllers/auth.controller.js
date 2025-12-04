const authService = require('../services/auth.service');
const { validationResult } = require('express-validator');

class AuthController {
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
      }

      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Usuario registrado exitosamente'
      });
    } catch (error) {
      if (error.message === 'La cédula ya está registrada') {
        return res.status(409).json({
          success: false,
          error: { message: error.message }
        });
      }
      next(error);
    }
  }

  // Login solo con cédula
  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
      }

      const { cedula } = req.body;
      const result = await authService.login(cedula);

      res.json({
        success: true,
        data: result,
        message: 'Inicio de sesión exitoso'
      });
    } catch (error) {
      if (error.message === 'Cédula no registrada' || error.message === 'Usuario inactivo') {
        return res.status(401).json({
          success: false,
          error: { message: error.message }
        });
      }
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      res.json({
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
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/logout
  async logout(req, res, next) {
    try {
      res.json({
        message: 'Sesión cerrada correctamente'
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/verify
  async verify(req, res, next) {
    try {
      res.json({
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
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
