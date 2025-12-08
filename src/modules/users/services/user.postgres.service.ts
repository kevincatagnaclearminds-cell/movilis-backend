import { pool } from '../../../config/postgres';
import { User } from '../../../types';

interface UserRow {
  id: string;
  cedula: string;
  name: string;
  email: string | null;
  role: 'admin' | 'user' | 'issuer';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

class UserPostgresService {
  // Buscar usuario por cédula
  async getUserByCedula(cedula: string): Promise<User | null> {
    try {
      // Limpiar la cédula: eliminar espacios y convertir a string
      const cleanedCedula = String(cedula || '').trim().replace(/\s+/g, '');
      
      // Buscar con comparación exacta primero
      let result = await pool.query<UserRow>(
        'SELECT * FROM users WHERE cedula = $1 AND is_active = true',
        [cleanedCedula]
      );
      
      // Si no encuentra, intentar con TRIM en la base de datos
      if (result.rows.length === 0) {
        result = await pool.query<UserRow>(
          'SELECT * FROM users WHERE TRIM(cedula) = $1 AND is_active = true',
          [cleanedCedula]
        );
      }
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
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
      const result = await pool.query<UserRow>(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
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
      const result = await pool.query<UserRow>(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
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
      const result = await pool.query<UserRow>(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      
      return result.rows.map(user => ({
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
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
      const result = await pool.query<UserRow>(
        `INSERT INTO users (cedula, name, email, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userData.cedula, userData.name, userData.email || null, userData.role || 'user']
      );
      
      const user = result.rows[0];
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      };
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
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
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (updateData.name) {
        fields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      if (updateData.email !== undefined) {
        fields.push(`email = $${paramCount++}`);
        values.push(updateData.email);
      }
      if (updateData.role) {
        fields.push(`role = $${paramCount++}`);
        values.push(updateData.role);
      }
      if (updateData.isActive !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updateData.isActive);
      }

      if (fields.length === 0) {
        return await this.getUserById(userId);
      }

      values.push(userId);

      const result = await pool.query<UserRow>(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error actualizando usuario:', err.message);
      throw error;
    }
  }

  // Eliminar usuario (soft delete)
  async deleteUser(userId: string): Promise<User | null> {
    try {
      const result = await pool.query<UserRow>(
        'UPDATE users SET is_active = false WHERE id = $1 RETURNING *',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        _id: user.id,
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email || undefined,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error eliminando usuario:', err.message);
      throw error;
    }
  }
}

export default new UserPostgresService();

