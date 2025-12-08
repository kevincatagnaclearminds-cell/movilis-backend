const Certificate = require('../models/certificate.model');
const pdfService = require('./pdf.service');
const User = require('../../users/models/user.model');
const certificatePostgresService = require('./certificate.postgres.service');
const googleDriveService = require('./googleDrive.service');
const fs = require('fs');
const path = require('path');

class CertificateService {
  /**
   * Crea un nuevo certificado
   * @param {Object} certificateData - Datos del certificado
   * @returns {Promise<Object>} - Certificado creado
   */
  async createCertificate(certificateData) {
    // Usar PostgreSQL directamente
    return await certificatePostgresService.createCertificate(certificateData);
  }

  /**
   * Obtiene un certificado por ID
   * @param {string} certificateId - ID del certificado
   * @returns {Promise<Object>} - Certificado encontrado
   */
  async getCertificateById(certificateId) {
    return await certificatePostgresService.getCertificateById(certificateId);
  }

  /**
   * Obtiene un certificado por número de certificado
   * @param {string} certificateNumber - Número del certificado
   * @returns {Promise<Object>} - Certificado encontrado
   * @note MongoDB no está en uso - esto debería usar PostgreSQL
   */
  async getCertificateByNumber(certificateNumber) {
    // TODO: Migrar a PostgreSQL
    return null; // MongoDB no está disponible
  }

  /**
   * Obtiene un certificado por código de verificación
   * @param {string} verificationCode - Código de verificación
   * @returns {Promise<Object>} - Certificado encontrado
   * @note MongoDB no está en uso - esto debería usar PostgreSQL
   */
  async getCertificateByVerificationCode(verificationCode) {
    // TODO: Migrar a PostgreSQL
    return null; // MongoDB no está disponible
  }

  /**
   * Obtiene todos los certificados con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} - Certificados y metadatos
   */
  async getAllCertificates(filters = {}, options = {}) {
    return await certificatePostgresService.getAllCertificates(filters, options);
  }

  /**
   * Obtiene certificados por emisor
   * @param {string} issuerId - ID del emisor
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} - Certificados y metadatos
   */
  async getCertificatesByIssuer(issuerId, options = {}) {
    return await this.getAllCertificates({ issuerId }, options);
  }

  /**
   * Obtiene certificados por destinatario
   * @param {string} recipientEmail - Email del destinatario
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} - Certificados y metadatos
   */
  async getCertificatesByRecipient(recipientEmail, options = {}) {
    return await certificatePostgresService.getCertificatesByRecipient(recipientEmail, options);
  }

  /**
   * Genera y emite un certificado (crea el PDF y lo guarda en Google Drive)
   * @param {string} certificateId - ID del certificado
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Certificado actualizado con PDF
   */
  async issueCertificate(certificateId, options = {}) {
    // Usar PostgreSQL en lugar de MongoDB
    const certificate = await certificatePostgresService.getCertificateById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificado no encontrado');
    }

    if (certificate.status === 'issued' && certificate.googleDriveFileId) {
      // Si ya está emitido y tiene Google Drive ID, verificar que existe
      if (googleDriveService.isAvailable()) {
        const exists = await googleDriveService.fileExists(certificate.googleDriveFileId);
        if (exists) {
          return certificate; // Ya existe, no regenerar
        }
      }
    }

    // Obtener información del emisor
    const userService = require('../../users/services/user.postgres.service');
    const issuer = await userService.getUserById(certificate.issuerId._id || certificate.issuerId);
    const issuerName = issuer?.name || options.issuerName || 'Movilis';

    // Obtener datos del destinatario desde PostgreSQL usando destinatario_id
    let recipientNameFromDB = certificate.recipientName || certificate.recipientId?.name;
    let recipientCedula = null;
    
    // Obtener datos completos del destinatario desde users
    if (certificate.destinatarioId || certificate.recipientId?._id) {
      try {
        const userId = certificate.destinatarioId || certificate.recipientId._id;
        const user = await userService.getUserById(userId);
        if (user) {
          recipientNameFromDB = user.name;
          recipientCedula = user.cedula;
        }
      } catch (error) {
        console.warn('No se pudo obtener usuario de PostgreSQL:', error.message);
      }
    }

    // Datos para el PDF
    const pdfData = {
      certificateNumber: certificate.certificateNumber,
      recipientName: recipientNameFromDB,
      courseName: certificate.courseName,
      courseDescription: certificate.courseDescription,
      issueDate: certificate.issueDate,
      expirationDate: certificate.expirationDate,
      issuerName,
      metadata: certificate.metadata
    };

    // Generar PDF
    let pdfBuffer;
    try {
      pdfBuffer = await pdfService.generateCertificateFromTemplate(pdfData, recipientCedula);
    } catch (error) {
      console.warn('Error generando con plantilla, usando método alternativo:', error.message);
      pdfBuffer = await pdfService.generateCertificateBuffer(pdfData);
    }

    // Firmar electrónicamente el PDF (si el emisor tiene firma configurada)
    try {
      const firmaService = require('../../firma/services/firma.service');
      const issuerCedula = issuer?.cedula;
      
      if (issuerCedula) {
        const firmaData = await firmaService.obtenerArchivoP12(issuerCedula);
        if (firmaData) {
          // Firmar el PDF con la firma electrónica del emisor
          pdfBuffer = await pdfService.signPDF(pdfBuffer, firmaData.buffer, firmaData.password);
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo firmar el certificado (continuando sin firma):', error.message);
      // Continuar sin firma si hay error
    }

    // Subir a Google Drive (si está configurado)
    let googleDriveFileId = null;

    if (googleDriveService.isAvailable()) {
      try {
        const fileName = `certificado-${certificate.certificateNumber}.pdf`;
        googleDriveFileId = await googleDriveService.uploadFile(pdfBuffer, fileName, certificate.certificateNumber);
      } catch (error) {
        console.warn('⚠️ Error subiendo a Google Drive (continuando sin guardar):', error.message);
        // En desarrollo, continuar sin Google Drive
      }
    } else {
      console.warn('⚠️ Google Drive no está configurado. El certificado se generará pero no se guardará.');
    }

    // Actualizar certificado en PostgreSQL
    await certificatePostgresService.updateCertificate(certificateId, {
      status: 'issued',
      googleDriveFileId
    });

    // Obtener certificado actualizado
    return await certificatePostgresService.getCertificateById(certificateId);
  }

  /**
   * Obtiene el PDF de un certificado desde Google Drive o lo genera si no existe
   * @param {string} certificateId - ID del certificado
   * @returns {Promise<Buffer>} - Buffer del PDF
   */
  async generateCertificatePDF(certificateId) {
    const certificate = await certificatePostgresService.getCertificateById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificado no encontrado');
    }

    // 1. Si tiene Google Drive ID, intentar descargarlo
    if (certificate.googleDriveFileId && googleDriveService.isAvailable()) {
      try {
        const exists = await googleDriveService.fileExists(certificate.googleDriveFileId);
        if (exists) {
          return await googleDriveService.downloadFile(certificate.googleDriveFileId);
        }
      } catch (error) {
        console.warn('⚠️ Error descargando de Google Drive, regenerando:', error.message);
      }
    }

    // 2. Si no existe en Google Drive, generarlo
    
    // Si Google Drive no está disponible, generar y devolver directamente
    if (!googleDriveService.isAvailable()) {
      
      // Obtener información del emisor
      const userService = require('../../users/services/user.postgres.service');
      const issuer = await userService.getUserById(certificate.issuerId._id || certificate.issuerId);
      const issuerName = issuer?.name || 'Movilis';

      // Obtener datos del destinatario
      let recipientNameFromDB = certificate.recipientName || certificate.recipientId?.name;
      let recipientCedula = null;
      
      if (certificate.destinatarioId || certificate.recipientId?._id) {
        try {
          const userId = certificate.destinatarioId || certificate.recipientId._id;
          const user = await userService.getUserById(userId);
          if (user) {
            recipientNameFromDB = user.name;
            recipientCedula = user.cedula;
          }
        } catch (error) {
          console.warn('No se pudo obtener usuario de PostgreSQL:', error.message);
        }
      }

      // Datos para el PDF
      const pdfData = {
        certificateNumber: certificate.certificateNumber,
        recipientName: recipientNameFromDB,
        courseName: certificate.courseName,
        courseDescription: certificate.courseDescription,
        issueDate: certificate.issueDate,
        expirationDate: certificate.expirationDate,
        issuerName,
        metadata: certificate.metadata
      };

      // Generar PDF directamente
      const pdfService = require('./pdf.service');
      let pdfBuffer;
      try {
        pdfBuffer = await pdfService.generateCertificateFromTemplate(pdfData, recipientCedula);
      } catch (error) {
        console.warn('Error generando con plantilla, usando método alternativo:', error.message);
        pdfBuffer = await pdfService.generateCertificateBuffer(pdfData);
      }

      // Actualizar estado a 'issued' sin Google Drive
      await certificatePostgresService.updateCertificate(certificateId, {
        status: 'issued'
      });

      return pdfBuffer;
    }
    
    // Si Google Drive está disponible, usar el flujo normal
    await this.issueCertificate(certificateId);
    
    // Intentar descargarlo de Google Drive después de generarlo
    const updatedCertificate = await certificatePostgresService.getCertificateById(certificateId);
    if (updatedCertificate.googleDriveFileId && googleDriveService.isAvailable()) {
      try {
        return await googleDriveService.downloadFile(updatedCertificate.googleDriveFileId);
      } catch (error) {
        console.error('❌ Error descargando de Google Drive después de generar:', error.message);
        throw new Error('No se pudo obtener el PDF del certificado desde Google Drive');
      }
    }

    throw new Error('No se pudo obtener el PDF del certificado');
  }

  /**
   * Actualiza un certificado
   * @param {string} certificateId - ID del certificado
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Certificado actualizado
   */
  async updateCertificate(certificateId, updateData) {
    // No permitir actualizar certificados emitidos
    const certificate = await Certificate.findById(certificateId);
    if (certificate && certificate.status === 'issued') {
      throw new Error('No se puede actualizar un certificado ya emitido');
    }

    return await Certificate.findByIdAndUpdate(
      certificateId,
      updateData,
      { new: true, runValidators: true }
    ).populate('issuerId', 'name email')
     .populate('recipientId', 'name email');
  }

  /**
   * Revoca un certificado
   * @param {string} certificateId - ID del certificado
   * @returns {Promise<Object>} - Certificado revocado
   */
  async revokeCertificate(certificateId) {
    const certificate = await Certificate.findByIdAndUpdate(
      certificateId,
      { status: 'revoked' },
      { new: true }
    );

    if (!certificate) {
      throw new Error('Certificado no encontrado');
    }

    return certificate;
  }

  /**
   * Elimina un certificado
   * @param {string} certificateId - ID del certificado
   * @returns {Promise<boolean>} - True si se eliminó correctamente
   */
  async deleteCertificate(certificateId) {
    const certificate = await Certificate.findById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificado no encontrado');
    }

    // Eliminar archivo PDF si existe
    if (certificate.pdfPath) {
      await pdfService.deleteCertificateFile(certificate.pdfPath);
    }

    await Certificate.findByIdAndDelete(certificateId);
    return true;
  }

  /**
   * Verifica un certificado por código de verificación
   * @param {string} verificationCode - Código de verificación
   * @returns {Promise<Object>} - Información de verificación
   */
  async verifyCertificate(verificationCode) {
    const certificate = await this.getCertificateByVerificationCode(verificationCode);
    
    if (!certificate) {
      return {
        valid: false,
        message: 'Certificado no encontrado'
      };
    }

    if (certificate.status === 'revoked') {
      return {
        valid: false,
        message: 'Certificado revocado',
        certificate: certificate
      };
    }

    if (certificate.isExpired()) {
      return {
        valid: false,
        message: 'Certificado expirado',
        certificate: certificate
      };
    }

    return {
      valid: true,
      message: 'Certificado válido',
      certificate: certificate
    };
  }

  /**
   * Obtiene estadísticas de certificados
   * @param {string} issuerId - ID del emisor (opcional)
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStatistics(issuerId = null) {
    const match = issuerId ? { issuerId } : {};

    const stats = await Certificate.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Certificate.countDocuments(match);
    const issued = await Certificate.countDocuments({ ...match, status: 'issued' });
    const revoked = await Certificate.countDocuments({ ...match, status: 'revoked' });
    const expired = await Certificate.countDocuments({ ...match, status: 'expired' });

    return {
      total,
      issued,
      revoked,
      expired,
      draft: total - issued - revoked - expired,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  }
}

module.exports = new CertificateService();

