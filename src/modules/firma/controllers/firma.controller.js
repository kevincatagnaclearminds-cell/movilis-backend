const firmaService = require('../services/firma.service');
const { parsearP12, validarExtension, validarTamano } = require('../utils/p12.utils');

/**
 * Controlador para gestionar firmas electrónicas
 */
class FirmaController {
  
  /**
   * POST /api/firma/upload
   * Subir y configurar certificado .p12
   */
  async uploadCertificado(req, res, next) {
    try {
      // Verificar que se subió un archivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo',
          message: 'No se proporcionó ningún archivo'
        });
      }

      const { password } = req.body;
      const archivo = req.file;

      // Validar que se proporcionó la contraseña
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña del certificado es requerida',
          message: 'La contraseña del certificado es requerida'
        });
      }

      // Validar extensión del archivo
      if (!validarExtension(archivo.originalname)) {
        return res.status(400).json({
          success: false,
          error: 'El archivo debe ser un certificado .p12 o .pfx válido',
          message: 'El archivo debe ser un certificado .p12 o .pfx válido'
        });
      }

      // Validar tamaño del archivo (máximo 5MB)
      if (!validarTamano(archivo.size)) {
        return res.status(400).json({
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (5MB)',
          message: 'El archivo excede el tamaño máximo permitido (5MB)'
        });
      }

      // Parsear y validar el certificado
      const resultado = parsearP12(archivo.buffer, password);

      if (!resultado.success) {
        return res.status(400).json({
          success: false,
          error: resultado.error,
          message: resultado.error
        });
      }

      // Verificar si el certificado está expirado
      if (resultado.info.estaExpirado) {
        return res.status(400).json({
          success: false,
          error: 'El certificado está expirado',
          message: 'El certificado está expirado'
        });
      }

      // Obtener la cédula del usuario autenticado
      const usuarioCedula = req.user.cedula;

      // Crear o actualizar la firma
      const firma = await firmaService.crearOActualizarFirma(
        usuarioCedula,
        resultado.info,
        archivo.buffer,
        password
      );

      return res.status(200).json({
        success: true,
        firma,
        message: 'Firma electrónica configurada correctamente'
      });

    } catch (error) {
      console.error('Error en uploadCertificado:', error);
      next(error);
    }
  }

  /**
   * GET /api/firma/status
   * Obtener estado de la firma del usuario
   */
  async getStatus(req, res, next) {
    try {
      const usuarioCedula = req.user.cedula;

      const estado = await firmaService.verificarEstadoFirma(usuarioCedula);

      if (!estado.tieneFirma) {
        return res.status(200).json({
          success: true,
          tieneFirma: false,
          firma: null,
          message: 'El usuario no tiene firma configurada'
        });
      }

      return res.status(200).json({
        success: true,
        tieneFirma: true,
        firma: estado.firma
      });

    } catch (error) {
      console.error('Error en getStatus:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/firma/delete
   * Eliminar firma del usuario
   */
  async deleteFirma(req, res, next) {
    try {
      const usuarioCedula = req.user.cedula;

      const eliminado = await firmaService.eliminarFirma(usuarioCedula);

      if (!eliminado) {
        return res.status(404).json({
          success: false,
          error: 'El usuario no tiene firma configurada',
          message: 'El usuario no tiene firma configurada'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Firma electrónica eliminada correctamente'
      });

    } catch (error) {
      console.error('Error en deleteFirma:', error);
      next(error);
    }
  }

  /**
   * POST /api/firma/validate
   * Validar certificado sin guardar
   */
  async validateCertificado(req, res, next) {
    try {
      // Verificar que se subió un archivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo',
          message: 'No se proporcionó ningún archivo'
        });
      }

      const { password } = req.body;
      const archivo = req.file;

      // Validar que se proporcionó la contraseña
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña del certificado es requerida',
          message: 'La contraseña del certificado es requerida'
        });
      }

      // Validar extensión del archivo
      if (!validarExtension(archivo.originalname)) {
        return res.status(400).json({
          success: false,
          error: 'El archivo debe ser un certificado .p12 o .pfx válido',
          message: 'El archivo debe ser un certificado .p12 o .pfx válido'
        });
      }

      // Validar tamaño del archivo
      if (!validarTamano(archivo.size)) {
        return res.status(400).json({
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (5MB)',
          message: 'El archivo excede el tamaño máximo permitido (5MB)'
        });
      }

      // Parsear y validar el certificado
      const resultado = parsearP12(archivo.buffer, password);

      if (!resultado.success) {
        return res.status(400).json({
          success: false,
          error: resultado.error,
          message: resultado.error
        });
      }

      // Devolver información del certificado (sin guardar)
      return res.status(200).json({
        success: true,
        firma: {
          nombreCertificado: resultado.info.nombreCertificado,
          fechaExpiracion: resultado.info.fechaExpiracion,
          emisor: resultado.info.emisor,
          serialNumber: resultado.info.serialNumber
        },
        message: 'Certificado válido'
      });

    } catch (error) {
      console.error('Error en validateCertificado:', error);
      next(error);
    }
  }
}

module.exports = new FirmaController();

