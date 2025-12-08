const express = require('express');
const multer = require('multer');
const firmaController = require('../controllers/firma.controller');
const { authenticate } = require('../../../middleware/auth');

const router = express.Router();

// Configuración de multer para almacenar en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Validar que sea un archivo .p12 o .pfx
    const allowedMimes = [
      'application/x-pkcs12',
      'application/pkcs12',
      'application/x-x509-ca-cert',
      'application/octet-stream' // Algunos navegadores envían este MIME
    ];
    
    const allowedExtensions = ['.p12', '.pfx'];
    const ext = file.originalname.toLowerCase().slice(-4);
    
    if (allowedExtensions.some(allowed => file.originalname.toLowerCase().endsWith(allowed))) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .p12 o .pfx'), false);
    }
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo excede el tamaño máximo permitido (5MB)',
        message: 'El archivo excede el tamaño máximo permitido (5MB)'
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message
    });
  }
  next();
};

/**
 * @route   POST /api/firma/upload
 * @desc    Subir y configurar certificado .p12
 * @access  Private
 */
router.post(
  '/upload',
  authenticate,
  upload.single('certificado'),
  handleMulterError,
  firmaController.uploadCertificado
);

/**
 * @route   GET /api/firma/status
 * @desc    Obtener estado de la firma del usuario
 * @access  Private
 */
router.get(
  '/status',
  authenticate,
  firmaController.getStatus
);

/**
 * @route   DELETE /api/firma/delete
 * @desc    Eliminar firma del usuario
 * @access  Private
 */
router.delete(
  '/delete',
  authenticate,
  firmaController.deleteFirma
);

/**
 * @route   POST /api/firma/validate
 * @desc    Validar certificado sin guardar
 * @access  Private
 */
router.post(
  '/validate',
  authenticate,
  upload.single('certificado'),
  handleMulterError,
  firmaController.validateCertificado
);

module.exports = router;

