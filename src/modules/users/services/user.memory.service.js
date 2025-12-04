const bcrypt = require('bcryptjs');
const { store } = require('../../../store/memoryStore');

class UserMemoryService {
  async createUser(userData) {
    // Verificar si el email ya existe
    const existing = store.users.find(u => u.email === userData.email);
    if (existing) {
      throw new Error('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = {
      _id: `user_${store.idCounter.users++}`,
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      role: userData.role || 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Método para comparar contraseñas
      comparePassword: async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
      }
    };

    store.users.push(user);
    return user;
  }

  async getUserById(userId) {
    const user = store.users.find(u => u._id === userId);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async getUserByEmail(email) {
    const user = store.users.find(u => u.email === email.toLowerCase());
    if (user) {
      // Agregar método comparePassword al objeto retornado
      return {
        ...user,
        comparePassword: async function(candidatePassword) {
          return await bcrypt.compare(candidatePassword, this.password);
        }
      };
    }
    return null;
  }

  async getAllUsers(query = {}) {
    return store.users.map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  }

  async updateUser(userId, updateData) {
    const index = store.users.findIndex(u => u._id === userId);
    if (index === -1) return null;

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    store.users[index] = {
      ...store.users[index],
      ...updateData,
      updatedAt: new Date()
    };

    const { password, ...userWithoutPassword } = store.users[index];
    return userWithoutPassword;
  }

  async deleteUser(userId) {
    const index = store.users.findIndex(u => u._id === userId);
    if (index === -1) return null;
    
    const deleted = store.users.splice(index, 1)[0];
    return deleted;
  }
}

module.exports = new UserMemoryService();

