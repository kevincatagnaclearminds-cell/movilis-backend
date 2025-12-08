import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { authenticate } from '../../../middleware/auth';

const router = Router();

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

export default router;

