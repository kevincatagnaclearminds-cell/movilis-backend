// Almacenamiento en memoria para desarrollo sin MongoDB
const bcrypt = require('bcryptjs');

const store = {
  users: [],
  certificates: [],
  idCounter: { users: 1, certificates: 1 }
};

// Usuario de prueba inicial
const initStore = async () => {
  const hashedPassword = await bcrypt.hash('123456', 10);
  store.users.push({
    _id: 'user_1',
    name: 'Usuario Test',
    email: 'test@example.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  store.idCounter.users = 2;
  console.log('📦 Store en memoria inicializado');
  console.log('👤 Usuario de prueba: test@example.com / 123456');
};

module.exports = { store, initStore };

