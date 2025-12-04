const { store } = require('../../../store/memoryStore');

class UserMemoryService {
  async createUser(userData) {
    // Verificar si la cédula ya existe
    const existing = store.users.find(u => u.cedula === userData.cedula);
    if (existing) {
      throw new Error('La cédula ya está registrada');
    }

    const user = {
      _id: `user_${store.idCounter.users++}`,
      cedula: userData.cedula,
      name: userData.name,
      email: userData.email ? userData.email.toLowerCase() : null,
      role: userData.role || 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    store.users.push(user);
    return user;
  }

  // Buscar usuario por cédula
  async getUserByCedula(cedula) {
    return store.users.find(u => u.cedula === cedula) || null;
  }

  async getUserById(userId) {
    return store.users.find(u => u._id === userId) || null;
  }

  async getAllUsers(query = {}) {
    return store.users.map(u => ({ ...u }));
  }

  async updateUser(userId, updateData) {
    const index = store.users.findIndex(u => u._id === userId);
    if (index === -1) return null;

    store.users[index] = {
      ...store.users[index],
      ...updateData,
      updatedAt: new Date()
    };

    return store.users[index];
  }

  async deleteUser(userId) {
    const index = store.users.findIndex(u => u._id === userId);
    if (index === -1) return null;
    
    const deleted = store.users.splice(index, 1)[0];
    return deleted;
  }
}

module.exports = new UserMemoryService();
