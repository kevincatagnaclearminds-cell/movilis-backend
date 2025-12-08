const jwt = require('jsonwebtoken');
const config = require('../../../config/config');
// Usar servicio con PostgreSQL
const userService = require('../../users/services/user.postgres.service');

class AuthService {
  generateToken(userId) {
    return jwt.sign({ userId }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
  }

  async register(userData) {
    // Verificar si la cédula ya existe
    const existingUser = await userService.getUserByCedula(userData.cedula);
    if (existingUser) {
      throw new Error('La cédula ya está registrada');
    }

    // Crear nuevo usuario
    const user = await userService.createUser(userData);
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || null,
        role: user.role
      },
      token
    };
  }

  // Login solo con cédula
  async login(cedula) {
    // Buscar usuario por cédula
    const user = await userService.getUserByCedula(cedula);
    
    if (!user) {
      throw new Error('Cédula no registrada');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new Error('Usuario inactivo');
    }

    // Generar token
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        cedula: user.cedula,
        name: user.name,
        nombre: user.name,
        nombreCompleto: user.name,
        email: user.email,
        correo: user.email,
        role: user.role
      },
      token
    };
  }
}

module.exports = new AuthService();
