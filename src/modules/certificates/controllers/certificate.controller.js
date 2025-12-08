const certificateService = require('../services/certificate.service');
const { validationResult } = require('express-validator');
const fs = require('fs');

class CertificateController {
  /**
   * Crear un nuevo certificado
   */
  async createCertificate(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
      }

      const certificateData = {
        ...req.body,
        issuerId: req.user._id
      };

      const certificate = await certificateService.createCertificate(certificateData);

      res.status(201).json({
        success: true,
        data: certificate,
        message: 'Certificado creado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener todos los certificados
   */
  async getCertificates(req, res, next) {
    try {
      const filters = {};
      const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      // Filtros opcionales
      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.recipientEmail) {
        filters.recipientEmail = req.query.recipientEmail;
      }

      // Si no es admin, solo ver sus propios certificados emitidos
      if (req.user.role !== 'admin') {
        filters.issuerId = req.user._id;
      }

      const result = await certificateService.getAllCertificates(filters, options);

      res.json({
        success: true,
        data: result.certificates,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener un certificado por ID
   */
  async getCertificateById(req, res, next) {
    try {
      // Convertir ID a número si es string numérico (PostgreSQL usa SERIAL)
      const certificateId = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id);
      const certificate = await certificateService.getCertificateById(certificateId);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      // Verificar permisos (solo admin o el emisor puede ver)
      if (req.user.role !== 'admin' && 
          certificate.issuerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado para ver este certificado' }
        });
      }

      res.json({
        success: true,
        data: certificate
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener un certificado por número
   */
  async getCertificateByNumber(req, res, next) {
    try {
      const certificate = await certificateService.getCertificateByNumber(req.params.number);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      res.json({
        success: true,
        data: certificate
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar un certificado
   */
  async updateCertificate(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
      }

      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      // Verificar permisos
      if (req.user.role !== 'admin' && 
          certificate.issuerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado para actualizar este certificado' }
        });
      }

      const updatedCertificate = await certificateService.updateCertificate(
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: updatedCertificate,
        message: 'Certificado actualizado exitosamente'
      });
    } catch (error) {
      if (error.message === 'No se puede actualizar un certificado ya emitido') {
        return res.status(400).json({
          success: false,
          error: { message: error.message }
        });
      }
      next(error);
    }
  }

  /**
   * Emitir un certificado (generar PDF)
   */
  async issueCertificate(req, res, next) {
    try {
      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      // Verificar permisos
      if (req.user.role !== 'admin' && 
          certificate.issuerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado para emitir este certificado' }
        });
      }

      const issuedCertificate = await certificateService.issueCertificate(
        req.params.id,
        { issuerName: req.user.name }
      );

      res.json({
        success: true,
        data: issuedCertificate,
        message: 'Certificado emitido exitosamente'
      });
    } catch (error) {
      if (error.message === 'El certificado ya ha sido emitido') {
        return res.status(400).json({
          success: false,
          error: { message: error.message }
        });
      }
      next(error);
    }
  }

  /**
   * Descargar PDF del certificado
   */
  async downloadCertificate(req, res, next) {
    try {
      // Convertir ID a número si es string (PostgreSQL usa SERIAL)
      const certificateId = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id);
      
      // Verificar si es un ID de demo (solo si parece ser un string de demo)
      if (String(certificateId).startsWith('cert-demo-')) {
        return res.status(400).json({
          success: false,
          error: { message: 'Este es un certificado de demostración. Los certificados reales se obtienen desde la base de datos.' }
        });
      }

      const certificate = await certificateService.getCertificateById(certificateId);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      // Verificar permisos
      if (req.user.role !== 'admin' && 
          certificate.issuerId._id.toString() !== req.user._id.toString() &&
          certificate.recipientId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado para descargar este certificado' }
        });
      }

      // Obtener PDF desde Google Drive o generarlo si no existe
      const pdfBuffer = await certificateService.generateCertificatePDF(certificateId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=certificado-${certificate.certificateNumber}.pdf`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ver certificado en el navegador (sin descargar)
   */
  async viewCertificate(req, res, next) {
    try {
      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      // Verificar permisos
      if (req.user.role !== 'admin' && 
          certificate.issuerId._id.toString() !== req.user._id.toString() &&
          certificate.recipientEmail !== req.user.email) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado para ver este certificado' }
        });
      }

      // Generar PDF si no existe
      const pdfBuffer = await certificateService.generateCertificatePDF(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename=certificado-${certificate.certificateNumber}.pdf`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revocar un certificado
   */
  async revokeCertificate(req, res, next) {
    try {
      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      // Solo admin o el emisor puede revocar
      if (req.user.role !== 'admin' && 
          certificate.issuerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado para revocar este certificado' }
        });
      }

      const revokedCertificate = await certificateService.revokeCertificate(req.params.id);

      res.json({
        success: true,
        data: revokedCertificate,
        message: 'Certificado revocado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar un certificado
   */
  async deleteCertificate(req, res, next) {
    try {
      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
      }

      // Solo admin puede eliminar
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { message: 'Solo los administradores pueden eliminar certificados' }
        });
      }

      await certificateService.deleteCertificate(req.params.id);

      res.json({
        success: true,
        message: 'Certificado eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verificar un certificado por código de verificación (público)
   */
  async verifyCertificate(req, res, next) {
    try {
      const { verificationCode } = req.params;
      const result = await certificateService.verifyCertificate(verificationCode);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          data: result
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener estadísticas de certificados
   */
  async getStatistics(req, res, next) {
    try {
      // Solo admin puede ver todas las estadísticas
      // Los emisores solo ven sus propias estadísticas
      const issuerId = req.user.role === 'admin' ? null : req.user._id;
      const statistics = await certificateService.getStatistics(issuerId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener certificados por destinatario (email)
   */
  async getCertificatesByRecipient(req, res, next) {
    try {
      const recipientEmail = req.query.email || req.user.email;
      
      // Solo admin o el propio usuario puede ver sus certificados
      if (req.user.role !== 'admin' && recipientEmail !== req.user.email) {
        return res.status(403).json({
          success: false,
          error: { message: 'No autorizado' }
        });
      }

      const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      // Usar Promise.race para timeout rápido
      const result = await Promise.race([
        certificateService.getCertificatesByRecipient(recipientEmail, options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2000)
        )
      ]);

      res.json({
        success: true,
        data: result.certificates || [],
        pagination: result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      });
    } catch (error) {
      // Si hay timeout o MongoDB no está disponible, devolver array vacío rápidamente
      if (error.message && (
        error.message.includes('buffering timed out') || 
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED')
      )) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(req.query.page || 1),
            limit: parseInt(req.query.limit || 10),
            total: 0,
            pages: 0
          }
        });
      }
      next(error);
    }
  }
}

module.exports = new CertificateController();

