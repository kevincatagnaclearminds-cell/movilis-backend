import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../../../config/config';
import userService from '../../users/services/user.postgres.service';
import { User } from '../../../types';

interface AuthResponse {
  user: {
    id: string;
    cedula: string;
    name: string;
    nombre?: string;
    nombreCompleto?: string;
    email?: string | null;
    correo?: string | null;
    role?: 'admin' | 'user' | 'issuer';
  };
  token: string;
}

class AuthService {
  generateToken(userId: string): string {
    const expiresIn = typeof config.jwtExpiresIn === 'string' ? config.jwtExpiresIn : String(config.jwtExpiresIn || '7d');
    const options: SignOptions = {
      expiresIn: expiresIn
    } as SignOptions;
    return jwt.sign({ userId }, config.jwtSecret as string, options);
  }

  async register(userData: {
    cedula: string;
    name: string;
    email?: string;
    role?: 'admin' | 'user' | 'issuer';
  }): Promise<AuthResponse> {
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
  async login(cedula: string): Promise<AuthResponse> {
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

export default new AuthService();

