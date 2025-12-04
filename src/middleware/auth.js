const jwt = require('jsonwebtoken');
const config = require('../config/config');
// Usar servicio en memoria (sin MongoDB)
const userService = require('../modules/users/services/user.memory.service');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token no proporcionado' }
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
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

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'No autenticado' }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'No autorizado para esta acción' }
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };

