import prisma from '../../../config/prisma';
import { User } from '../../../types';
import type { users } from '@prisma/client';

class UserPrismaService {
  // Buscar usuario por cédula
  async getUserByCedula(cedula: string): Promise<User | null> {
    try {
      // Limpiar la cédula: eliminar espacios y convertir a string
      const cleanedCedula = String(cedula || '').trim().replace(/\s+/g, '');
      
      // Buscar con comparación exacta primero
      let user = await prisma.users.findFirst({
        where: {
          cedula: cleanedCedula,
          is_active: true
        }
      });
      
      // Si no encuentra, intentar con TRIM en la base de datos usando query raw
      if (!user) {
        const result = await prisma.$queryRaw<Array<{
          id: string;
          cedula: string;
          name: string;
          email: string | null;
          role: string | null;
          is_active: boolean | null;
          created_at: Date;
          updated_at: Date;
        }>>`
          SELECT * FROM users 
          WHERE TRIM(cedula) = ${cleanedCedula} AND is_active = true
          LIMIT 1
        `;
        
        user = result[0] || null;
      }
      
      if (!user) {
        return null;
      }
      
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role as 'admin' | 'user' | 'issuer' | undefined,
        isActive: user.is_active ?? true,
        createdAt: user.created_at || new Date(),
        updatedAt: user.updated_at || new Date()
      };
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error buscando usuario por cédula:', err.message);
      throw error;
    }
  }

  // Buscar usuario por ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role as 'admin' | 'user' | 'issuer' | undefined,
        isActive: user.is_active ?? true,
        createdAt: user.created_at || new Date(),
        updatedAt: user.updated_at || new Date()
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error buscando usuario por ID:', err.message);
      throw error;
    }
  }

  // Buscar usuario por email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.users.findFirst({
        where: {
          email: email,
          is_active: true
        }
      });

      if (!user) {
        return null;
      }

      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role as 'admin' | 'user' | 'issuer' | undefined,
        isActive: user.is_active ?? true,
        createdAt: user.created_at || new Date(),
        updatedAt: user.updated_at || new Date()
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error buscando usuario por email:', err.message);
      throw error;
    }
  }

  // Obtener todos los usuarios
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await prisma.users.findMany({
        orderBy: { created_at: 'desc' }
      });
      
      return users.map((user: users) => ({
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role as 'admin' | 'user' | 'issuer' | undefined,
        isActive: user.is_active ?? true,
        createdAt: user.created_at || new Date(),
        updatedAt: user.updated_at || new Date()
      }));
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo usuarios:', err.message);
      throw error;
    }
  }

  // Crear usuario
  async createUser(userData: {
    cedula: string;
    name: string;
    email?: string;
    role?: 'admin' | 'user' | 'issuer';
  }): Promise<User> {
    try {
      const user = await prisma.users.create({
        data: {
          cedula: userData.cedula,
          name: userData.name,
          email: userData.email || null,
          role: userData.role || 'user'
        }
      });
      
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role as 'admin' | 'user' | 'issuer' | undefined,
        isActive: user.is_active ?? true,
        createdAt: user.created_at || new Date(),
        updatedAt: user.updated_at || new Date()
      };
    } catch (error: any) {
      if (error.code === 'P2002') { // Prisma unique constraint violation
        throw new Error('La cédula ya está registrada');
      }
      throw error;
    }
  }

  // Actualizar usuario
  async updateUser(userId: string, updateData: {
    name?: string;
    email?: string;
    role?: 'admin' | 'user' | 'issuer';
    isActive?: boolean;
  }): Promise<User | null> {
    try {
      const user = await prisma.users.update({
        where: { id: userId },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.email !== undefined && { email: updateData.email || null }),
          ...(updateData.role && { role: updateData.role }),
          ...(updateData.isActive !== undefined && { is_active: updateData.isActive }),
          updated_at: new Date()
        }
      });

      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role as 'admin' | 'user' | 'issuer' | undefined,
        isActive: user.is_active ?? true,
        createdAt: user.created_at || new Date(),
        updatedAt: user.updated_at || new Date()
      };
    } catch (error: any) {
      if (error.code === 'P2025') { // Prisma record not found
        return null;
      }
      const err = error as Error;
      console.error('Error actualizando usuario:', err.message);
      throw error;
    }
  }

  // Eliminar usuario (soft delete)
  async deleteUser(userId: string): Promise<User | null> {
    try {
      const user = await prisma.users.update({
        where: { id: userId },
        data: { 
          is_active: false,
          updated_at: new Date()
        }
      });

      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role as 'admin' | 'user' | 'issuer' | undefined,
        isActive: user.is_active ?? false,
        createdAt: user.created_at || new Date(),
        updatedAt: user.updated_at || new Date()
      };
    } catch (error: any) {
      if (error.code === 'P2025') { // Prisma record not found
        return null;
      }
      const err = error as Error;
      console.error('Error eliminando usuario:', err.message);
      throw error;
    }
  }
}

export default new UserPrismaService();

