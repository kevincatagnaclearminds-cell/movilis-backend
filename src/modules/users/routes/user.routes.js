const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../../../middleware/auth');
const { body } = require('express-validator');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Validaciones
const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('role').optional().isIn(['admin', 'user', 'issuer']).withMessage('Rol inválido')
];

// Rutas
router.get('/profile', userController.getProfile);  // Obtener perfil del usuario autenticado
router.get('/', authorize('admin'), userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', updateUserValidation, userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;

