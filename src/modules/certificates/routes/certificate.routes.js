const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { authenticate, authorize } = require('../../../middleware/auth');
const { body, query, param } = require('express-validator');

// Validaciones
const createCertificateValidation = [
  body('courseName')
    .trim()
    .notEmpty()
    .withMessage('El nombre del curso es requerido')
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre del curso debe tener entre 2 y 200 caracteres'),
  // Validación: debe tener destinatarioId o recipientId
  body('destinatarioId')
    .optional()
    .notEmpty()
    .withMessage('El ID del destinatario es requerido'),
  body('recipientId')
    .optional()
    .notEmpty()
    .withMessage('El ID del destinatario es requerido'),
  body().custom((value) => {
    if (!value.destinatarioId && !value.recipientId) {
      throw new Error('Debe proporcionar destinatarioId o recipientId');
    }
    return true;
  }),
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
  body('recipientName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del destinatario no puede estar vacío')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('recipientEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email inválido'),
  body('courseName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del curso no puede estar vacío')
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre del curso debe tener entre 2 y 200 caracteres'),
  body('courseDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('expirationDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración inválida')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
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
    .isIn(['createdAt', 'issueDate', 'courseName', 'recipientName'])
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

// Ruta pública para obtener certificado por número
router.get(
  '/number/:number',
  [
    param('number')
      .notEmpty()
      .withMessage('Número de certificado requerido')
  ],
  certificateController.getCertificateByNumber
);

// Todas las demás rutas requieren autenticación
router.use(authenticate);

// Rutas de certificados
router.post(
  '/',
  createCertificateValidation,
  certificateController.createCertificate
);

router.get(
  '/',
  queryValidation,
  certificateController.getCertificates
);

router.get(
  '/statistics',
  certificateController.getStatistics
);

router.get(
  '/recipient',
  queryValidation,
  certificateController.getCertificatesByRecipient
);

router.get(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido')
  ],
  certificateController.getCertificateById
);

router.put(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido'),
    ...updateCertificateValidation
  ],
  certificateController.updateCertificate
);

router.post(
  '/:id/issue',
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido')
  ],
  certificateController.issueCertificate
);

router.get(
  '/:id/download',
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido')
  ],
  certificateController.downloadCertificate
);

router.get(
  '/:id/view',
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado inválido')
  ],
  certificateController.viewCertificate
);

router.post(
  '/:id/revoke',
  [
    param('id')
      .notEmpty()
      .withMessage('ID de certificado requerido')
  ],
  certificateController.revokeCertificate
);

router.delete(
  '/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('ID de certificado inválido')
  ],
  authorize('admin'),
  certificateController.deleteCertificate
);

module.exports = router;

