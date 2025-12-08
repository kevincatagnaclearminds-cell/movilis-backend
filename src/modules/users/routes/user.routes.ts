import { Router } from 'express';
import { body } from 'express-validator';
import userController from '../controllers/user.controller';
import { authenticate, authorize } from '../../../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Validaciones
const createUserValidation = [
  body('cedula')
    .trim()
    .notEmpty()
    .withMessage('La cédula es requerida')
    .isLength({ min: 5, max: 20 })
    .withMessage('La cédula debe tener entre 5 y 20 caracteres'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['admin', 'user', 'issuer'])
    .withMessage('Rol inválido')
];

const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('role').optional().isIn(['admin', 'user', 'issuer']).withMessage('Rol inválido')
];

// Rutas
router.get('/profile', userController.getProfile);  // Obtener perfil del usuario autenticado
router.get('/', authorize('admin'), userController.getUsers);
router.post('/', authorize('admin'), createUserValidation, userController.createUser); // Crear usuario (solo admin)
router.get('/:id', userController.getUserById);
router.put('/:id', updateUserValidation, userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);

export default router;

