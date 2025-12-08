import { Router } from 'express';
import { body, query, param } from 'express-validator';
import certificateController from '../controllers/certificate.controller';
import { authenticate, authorize } from '../../../middleware/auth';

const router = Router();

// Validaciones
const createCertificateValidation = [
  body('courseName')
    .trim()
    .notEmpty()
    .withMessage('El nombre del curso es requerido')
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre del curso debe tener entre 2 y 200 caracteres'),
  // Validación: puede tener destinatarioId, recipientId o userIds (array)
  body('destinatarioId')
    .optional()
    .isUUID()
    .withMessage('ID de destinatario inválido'),
  body('recipientId')
    .optional()
    .isUUID()
    .withMessage('ID de destinatario inválido'),
  body('userIds')
    .optional()
    .isArray()
    .withMessage('userIds debe ser un array')
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every((id: unknown) => typeof id === 'string' && id.length > 0);
      }
      return true;
    })
    .withMessage('Todos los IDs de usuario deben ser válidos'),
  body('institucion')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('La institución debe tener entre 2 y 255 caracteres'),
  body('courseDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('expirationDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === null || value === '') {
        return true; // Es opcional, puede ser null o vacío
      }
      // Si tiene valor, debe ser una fecha válida y futura
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Fecha de expiración inválida');
      }
      if (date <= new Date()) {
        throw new Error('La fecha de expiración debe ser futura');
      }
      return true;
    }),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Los metadatos deben ser un objeto')
];

const updateCertificateValidation = [
  body('courseName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del curso no puede estar vacío')
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre del curso debe tener entre 2 y 200 caracteres'),
  body('institucion')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('La institución debe tener entre 2 y 255 caracteres'),
  body('destinatarioId') // Permitir actualizar el destinatario
    .optional()
    .notEmpty()
    .withMessage('El ID del destinatario es requerido')
    .isUUID()
    .withMessage('ID de destinatario inválido'),
  body('courseDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('expirationDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === null || value === '') {
        return true; // Es opcional, puede ser null o vacío
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Fecha de expiración inválida');
      }
      if (date <= new Date()) {
        throw new Error('La fecha de expiración debe ser futura');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['draft', 'issued', 'revoked', 'expired'])
    .withMessage('Estado inválido')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'issueDate', 'courseName', 'recipientName', 'status'])
    .withMessage('Campo de ordenamiento inválido'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Orden inválido (debe ser asc o desc)'),
  query('status')
    .optional()
    .isIn(['draft', 'issued', 'revoked', 'expired'])
    .withMessage('Estado inválido'),
  query('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
];

// Ruta pública para verificar certificados
router.get(
  '/verify/:verificationCode',
  [
    param('verificationCode')
      .notEmpty()
      .withMessage('Código de verificación requerido')
  ],
  certificateController.verifyCertificate
);

// Todas las demás rutas requieren autenticación
router.use(authenticate);

// Rutas de certificados
router.post(
  '/',
  authorize('admin'), // Solo admins pueden crear certificados
  createCertificateValidation,
  certificateController.createCertificate
);

router.get(
  '/',
  authorize('admin', 'issuer'), // Admin e issuer pueden ver todos los certificados
  queryValidation,
  certificateController.getCertificates
);

router.get(
  '/:id',
  [
    param('id')
      .notEmpty() // Aceptar SERIAL (número) o UUID
      .withMessage('ID de certificado inválido')
  ],
  certificateController.getCertificateById
);

router.put(
  '/:id',
  authorize('admin', 'issuer'), // Solo admins o emisores pueden actualizar
  [
    param('id')
      .notEmpty() // Aceptar SERIAL (número) o UUID
      .withMessage('ID de certificado inválido'),
    ...updateCertificateValidation
  ],
  certificateController.updateCertificate
);

router.post(
  '/:id/issue',
  authorize('admin', 'issuer'), // Solo admins o emisores pueden emitir
  [
    param('id')
      .notEmpty() // Aceptar SERIAL (número) o UUID
      .withMessage('ID de certificado requerido')
  ],
  certificateController.issueCertificate
);

router.get(
  '/:id/download',
  [
    param('id')
      .notEmpty() // Aceptar SERIAL (número) o UUID
      .withMessage('ID de certificado requerido')
  ],
  certificateController.downloadCertificate
);

router.get(
  '/:id/view',
  [
    param('id')
      .notEmpty() // Aceptar SERIAL (número) o UUID
      .withMessage('ID de certificado inválido')
  ],
  certificateController.viewCertificate
);

router.post(
  '/:id/revoke',
  authorize('admin', 'issuer'), // Solo admins o emisores pueden revocar
  [
    param('id')
      .notEmpty() // Aceptar SERIAL (número) o UUID
      .withMessage('ID de certificado requerido')
  ],
  certificateController.revokeCertificate
);

// Asignar usuarios a un certificado
router.post(
  '/:id/assign',
  authorize('admin', 'issuer'), // Solo admins o emisores pueden asignar
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido'),
    body('userIds')
      .isArray({ min: 1 })
      .withMessage('Debe proporcionar al menos un ID de usuario')
      .custom((value) => {
        return value.every((id: unknown) => typeof id === 'string' && id.length > 0);
      })
      .withMessage('Todos los IDs de usuario deben ser válidos')
  ],
  certificateController.assignUsersToCertificate
);

// Desasignar un usuario de un certificado
router.delete(
  '/:id/assign/:userId',
  authorize('admin', 'issuer'), // Solo admins o emisores pueden desasignar
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido'),
    param('userId')
      .isUUID()
      .withMessage('ID de usuario inválido')
  ],
  certificateController.unassignUserFromCertificate
);

// Obtener usuarios asignados a un certificado
router.get(
  '/:id/users',
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido')
  ],
  certificateController.getCertificateUsers
);

router.get(
  '/statistics',
  authorize('admin', 'issuer'), // Solo admins o emisores pueden ver estadísticas
  certificateController.getStatistics
);

router.get(
  '/recipient',
  queryValidation,
  certificateController.getCertificatesByRecipient
);

export default router;

