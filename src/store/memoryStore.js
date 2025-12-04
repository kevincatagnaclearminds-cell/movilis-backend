// Almacenamiento en memoria para desarrollo sin MongoDB

const store = {
  users: [],
  certificates: [],
  idCounter: { users: 1, certificates: 1 }
};

// Usuarios de prueba inicial
const initStore = async () => {
  store.users.push(
    {
      _id: 'user_1',
      cedula: '123456789',
      name: 'Usuario Test',
      email: 'test@example.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'user_2',
      cedula: '987654321',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  );
  store.idCounter.users = 3;
  console.log('📦 Store en memoria inicializado');
  console.log('👤 Usuarios de prueba:');
  console.log('   - Cédula: 123456789 (Admin)');
  console.log('   - Cédula: 987654321 (Usuario)');
};

module.exports = { store, initStore };

