import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../types';
import firmaService from '../services/firma.service';
import { parsearP12, validarExtension, validarTamano } from '../utils/p12.utils';

/**
 * Controlador para gestionar firmas electrónicas
 */
class FirmaController {
  
  /**
   * POST /api/firma/upload
   * Subir y configurar certificado .p12
   */
  async uploadCertificado(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verificar que se subió un archivo
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo',
          message: 'No se proporcionó ningún archivo'
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
          message: 'No autenticado'
        });
        return;
      }

      const { password } = req.body;
      const archivo = req.file;

      // Validar que se proporcionó la contraseña
      if (!password) {
        res.status(400).json({
          success: false,
          error: 'La contraseña del certificado es requerida',
          message: 'La contraseña del certificado es requerida'
        });
        return;
      }

      // Validar extensión del archivo
      if (!validarExtension(archivo.originalname)) {
        res.status(400).json({
          success: false,
          error: 'El archivo debe ser un certificado .p12 o .pfx válido',
          message: 'El archivo debe ser un certificado .p12 o .pfx válido'
        });
        return;
      }

      // Validar tamaño del archivo (máximo 5MB)
      if (!validarTamano(archivo.size)) {
        res.status(400).json({
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (5MB)',
          message: 'El archivo excede el tamaño máximo permitido (5MB)'
        });
        return;
      }

      // Parsear y validar el certificado
      const resultado = parsearP12(archivo.buffer, password);

      if (!resultado.success) {
        res.status(400).json({
          success: false,
          error: resultado.error,
          message: resultado.error
        });
        return;
      }

      // Verificar si el certificado está expirado
      if (!resultado.info || resultado.info.estaExpirado) {
        res.status(400).json({
          success: false,
          error: 'El certificado está expirado',
          message: 'El certificado está expirado'
        });
        return;
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

      res.status(200).json({
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
  async getStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
          message: 'No autenticado'
        });
        return;
      }

      const usuarioCedula = req.user.cedula;

      const estado = await firmaService.verificarEstadoFirma(usuarioCedula);

      if (!estado.tieneFirma) {
        res.status(200).json({
          success: true,
          tieneFirma: false,
          firma: null,
          message: 'El usuario no tiene firma configurada'
        });
        return;
      }

      res.status(200).json({
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
  async deleteFirma(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
          message: 'No autenticado'
        });
        return;
      }

      const usuarioCedula = req.user.cedula;

      const eliminado = await firmaService.eliminarFirma(usuarioCedula);

      if (!eliminado) {
        res.status(404).json({
          success: false,
          error: 'El usuario no tiene firma configurada',
          message: 'El usuario no tiene firma configurada'
        });
        return;
      }

      res.status(200).json({
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
  async validateCertificado(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verificar que se subió un archivo
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo',
          message: 'No se proporcionó ningún archivo'
        });
        return;
      }

      const { password } = req.body;
      const archivo = req.file;

      // Validar que se proporcionó la contraseña
      if (!password) {
        res.status(400).json({
          success: false,
          error: 'La contraseña del certificado es requerida',
          message: 'La contraseña del certificado es requerida'
        });
        return;
      }

      // Validar extensión del archivo
      if (!validarExtension(archivo.originalname)) {
        res.status(400).json({
          success: false,
          error: 'El archivo debe ser un certificado .p12 o .pfx válido',
          message: 'El archivo debe ser un certificado .p12 o .pfx válido'
        });
        return;
      }

      // Validar tamaño del archivo
      if (!validarTamano(archivo.size)) {
        res.status(400).json({
          success: false,
          error: 'El archivo excede el tamaño máximo permitido (5MB)',
          message: 'El archivo excede el tamaño máximo permitido (5MB)'
        });
        return;
      }

      // Parsear y validar el certificado
      const resultado = parsearP12(archivo.buffer, password);

      if (!resultado.success) {
        res.status(400).json({
          success: false,
          error: resultado.error,
          message: resultado.error
        });
        return;
      }

      // Devolver información del certificado (sin guardar)
      if (!resultado.info) {
        res.status(400).json({
          success: false,
          error: resultado.error || 'Error al procesar el certificado',
          message: resultado.error || 'Error al procesar el certificado'
        });
        return;
      }

      res.status(200).json({
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

export default new FirmaController();

