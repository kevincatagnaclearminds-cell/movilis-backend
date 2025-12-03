const Certificate = require('../models/certificate.model');
const pdfService = require('./pdf.service');
const User = require('../../users/models/user.model');

class CertificateService {
  /**
   * Crea un nuevo certificado
   * @param {Object} certificateData - Datos del certificado
   * @returns {Promise<Object>} - Certificado creado
   */
  async createCertificate(certificateData) {
    const certificate = new Certificate(certificateData);
    await certificate.save();
    return certificate;
  }

  /**
   * Obtiene un certificado por ID
   * @param {string} certificateId - ID del certificado
   * @returns {Promise<Object>} - Certificado encontrado
   */
  async getCertificateById(certificateId) {
    return await Certificate.findById(certificateId)
      .populate('issuerId', 'name email')
      .populate('recipientId', 'name email');
  }

  /**
   * Obtiene un certificado por número de certificado
   * @param {string} certificateNumber - Número del certificado
   * @returns {Promise<Object>} - Certificado encontrado
   */
  async getCertificateByNumber(certificateNumber) {
    return await Certificate.findOne({ certificateNumber })
      .populate('issuerId', 'name email')
      .populate('recipientId', 'name email');
  }

  /**
   * Obtiene un certificado por código de verificación
   * @param {string} verificationCode - Código de verificación
   * @returns {Promise<Object>} - Certificado encontrado
   */
  async getCertificateByVerificationCode(verificationCode) {
    return await Certificate.findOne({ verificationCode })
      .populate('issuerId', 'name email')
      .populate('recipientId', 'name email');
  }

  /**
   * Obtiene todos los certificados con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} - Certificados y metadatos
   */
  async getAllCertificates(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const query = Certificate.find(filters)
      .populate('issuerId', 'name email')
      .populate('recipientId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const [certificates, total] = await Promise.all([
      query.exec(),
      Certificate.countDocuments(filters)
    ]);

    return {
      certificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
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
    return await this.getAllCertificates({ recipientEmail }, options);
  }

  /**
   * Genera y emite un certificado (crea el PDF)
   * @param {string} certificateId - ID del certificado
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Certificado actualizado con PDF
   */
  async issueCertificate(certificateId, options = {}) {
    const certificate = await this.getCertificateById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificado no encontrado');
    }

    if (certificate.status === 'issued') {
      throw new Error('El certificado ya ha sido emitido');
    }

    // Obtener información del emisor
    const issuer = await User.findById(certificate.issuerId);
    const issuerName = issuer?.name || options.issuerName || 'Movilis';

    // Datos para el PDF
    const pdfData = {
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName,
      courseName: certificate.courseName,
      courseDescription: certificate.courseDescription,
      issueDate: certificate.issueDate,
      expirationDate: certificate.expirationDate,
      issuerName,
      metadata: certificate.metadata
    };

    // Generar PDF
    const pdfPath = await pdfService.generateCertificate(pdfData);

    // Actualizar certificado
    certificate.pdfPath = pdfPath;
    certificate.status = 'issued';
    certificate.isVerified = true;
    await certificate.save();

    return certificate;
  }

  /**
   * Genera el PDF de un certificado sin guardarlo en disco (para descarga directa)
   * @param {string} certificateId - ID del certificado
   * @returns {Promise<Buffer>} - Buffer del PDF
   */
  async generateCertificatePDF(certificateId) {
    const certificate = await this.getCertificateById(certificateId);
    
    if (!certificate) {
      throw new Error('Certificado no encontrado');
    }

    const issuer = await User.findById(certificate.issuerId);
    const issuerName = issuer?.name || 'Movilis';

    const pdfData = {
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName,
      courseName: certificate.courseName,
      courseDescription: certificate.courseDescription,
      issueDate: certificate.issueDate,
      expirationDate: certificate.expirationDate,
      issuerName,
      metadata: certificate.metadata
    };

    return await pdfService.generateCertificateBuffer(pdfData);
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
