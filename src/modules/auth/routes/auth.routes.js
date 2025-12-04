const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../../../middleware/auth');
const { body } = require('express-validator');

// Validaciones
const registerValidation = [
  body('cedula').trim().notEmpty().withMessage('La cédula es requerida'),
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').optional().isEmail().withMessage('Email inválido')
];

const loginValidation = [
  body('cedula').trim().notEmpty().withMessage('La cédula es requerida')
];

// Rutas
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);
router.get('/verify', authenticate, authController.verify);

module.exports = router;
