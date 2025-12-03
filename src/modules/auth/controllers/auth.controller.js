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
        data: result
      });
    } catch (error) {
      if (error.message === 'El email ya está registrado') {
        return res.status(409).json({
          success: false,
          error: { message: error.message }
        });
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
      }

      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === 'Credenciales inválidas' || error.message === 'Usuario inactivo') {
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
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

