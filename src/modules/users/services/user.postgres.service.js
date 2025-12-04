const { pool } = require('../../../config/postgres');

class UserPostgresService {
  // Buscar usuario por cédula
  async getUserByCedula(cedula) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE cedula = $1 AND is_active = true',
        [cedula]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      return {
        _id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      console.error('Error buscando usuario por cédula:', error.message);
      throw error;
    }
  }

  // Buscar usuario por ID
  async getUserById(userId) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      return {
        _id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      console.error('Error buscando usuario por ID:', error.message);
      throw error;
    }
  }

  // Crear usuario
  async createUser(userData) {
    try {
      const result = await pool.query(
        `INSERT INTO users (cedula, name, email, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userData.cedula, userData.name, userData.email || null, userData.role || 'user']
      );
      
      const user = result.rows[0];
      return {
        _id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      };
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('La cédula ya está registrada');
      }
      throw error;
    }
  }

  // Obtener todos los usuarios
  async getAllUsers() {
    try {
      const result = await pool.query(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      
      return result.rows.map(user => ({
        _id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios:', error.message);
      throw error;
    }
  }

  // Actualizar usuario
  async updateUser(userId, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.name) {
        fields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      if (updateData.email) {
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

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        _id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active
      };
    } catch (error) {
      console.error('Error actualizando usuario:', error.message);
      throw error;
    }
  }

  // Eliminar usuario
  async deleteUser(userId) {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING *',
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error eliminando usuario:', error.message);
      throw error;
    }
  }
}

module.exports = new UserPostgresService();

