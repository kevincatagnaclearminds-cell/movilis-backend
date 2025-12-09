import certificatePostgresService from './certificate.postgres.service';
import googleDriveService from './googleDrive.service';
import pdfService from './pdf.service';
import userService from '../../users/services/user.postgres.service';
import { Certificate } from '../../../types';

interface CertificateFilters {
  status?: string;
  recipientEmail?: string;
  issuerId?: string;
}

interface CertificateOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface CertificatePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface CertificatesResult {
  certificates: Certificate[];
  pagination: CertificatePagination;
}

interface IssueOptions {
  issuerName?: string;
}

interface VerifyResult {
  valid: boolean;
  message: string;
  certificate?: Certificate;
}

interface Statistics {
  total: number;
  issued: number;
  revoked: number;
  expired: number;
  draft: number;
  byStatus: Record<string, number>;
}

class CertificateService {
  /**
   * Crea un nuevo certificado
   */
  async createCertificate(certificateData: Partial<Certificate> & { userIds?: string[] }): Promise<Certificate> {
    // Usar PostgreSQL directamente
    return await certificatePostgresService.createCertificate(certificateData);
  }

  /**
   * Obtiene un certificado por ID
   */
  async getCertificateById(certificateId: string | number): Promise<Certificate | null> {
    return await certificatePostgresService.getCertificateById(certificateId);
  }

  /**
   * Obtiene un certificado por número de certificado
   */
  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | null> {
    return await certificatePostgresService.getCertificateByNumber(certificateNumber);
  }

  /**
   * Obtiene un certificado por código de verificación
   */
  async getCertificateByVerificationCode(verificationCode: string): Promise<Certificate | null> {
    return await certificatePostgresService.getCertificateByVerificationCode(verificationCode);
  }

  /**
   * Obtiene todos los certificados con filtros
   */
  async getAllCertificates(filters: CertificateFilters = {}, options: CertificateOptions = {}): Promise<CertificatesResult> {
    return await certificatePostgresService.getAllCertificates(filters, options);
  }

  /**
   * Obtiene certificados por emisor
   */
  async getCertificatesByIssuer(issuerId: string, options: CertificateOptions = {}): Promise<CertificatesResult> {
    return await this.getAllCertificates({ issuerId }, options);
  }

  /**
   * Obtiene certificados por destinatario
   */
  async getCertificatesByRecipient(recipientEmail: string, options: CertificateOptions = {}): Promise<CertificatesResult> {
    return await certificatePostgresService.getCertificatesByRecipient(recipientEmail, options);
  }

  /**
   * Genera y emite un certificado (crea el PDF y lo guarda en Google Drive)
   */
  async issueCertificate(certificateId: string | number, options: IssueOptions = {}): Promise<Certificate> {
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
    const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
      ? (certificate.issuerId._id || certificate.issuerId.id || '')
      : (certificate.issuerId || certificate.emisorId || '');
    const issuer = await userService.getUserById(issuerIdValue as string);
    const issuerName = issuer?.name || options.issuerName || 'Movilis';

    // Obtener datos del destinatario desde PostgreSQL usando destinatario_id
    const recipientIdValueForName = typeof certificate.recipientId === 'object' && certificate.recipientId !== null
      ? certificate.recipientId.name
      : undefined;
    let recipientNameFromDB = certificate.recipientName || recipientIdValueForName;
    let recipientCedula: string | null = null;
    
    // Obtener datos completos del destinatario desde users
    const recipientIdValue = typeof certificate.recipientId === 'object' && certificate.recipientId !== null
      ? (certificate.recipientId._id || certificate.recipientId.id)
      : (certificate.recipientId || certificate.destinatarioId);
    if (recipientIdValue) {
      try {
        const user = await userService.getUserById(recipientIdValue as string);
        if (user) {
          recipientNameFromDB = user.name;
          recipientCedula = user.cedula;
        }
      } catch (error) {
        const err = error as Error;
        console.warn('No se pudo obtener usuario de PostgreSQL:', err.message);
      }
    }

    // Datos para el PDF
    const pdfData = {
      certificateNumber: certificate.certificateNumber,
      recipientName: recipientNameFromDB || '',
      courseName: certificate.courseName,
      courseDescription: certificate.courseDescription,
      issueDate: certificate.issueDate,
      expirationDate: certificate.expirationDate,
      issuerName,
      metadata: certificate.metadata
    };

    // Generar PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await pdfService.generateCertificateFromTemplate(pdfData, recipientCedula);
    } catch (error) {
      const err = error as Error;
      console.warn('Error generando con plantilla, usando método alternativo:', err.message);
      pdfBuffer = await pdfService.generateCertificateBuffer(pdfData);
    }

    // Firmar electrónicamente el PDF (usando el certificado configurado en .env)
    try {
      pdfBuffer = await pdfService.signPDF(pdfBuffer, Buffer.alloc(0), '');
    } catch (error) {
      const err = error as Error;
      console.warn('⚠️ No se pudo firmar el certificado (continuando sin firma):', err.message);
      // Continuar sin firma si hay error
    }

    // Subir a Google Drive (si está configurado)
    let googleDriveFileId: string | null = null;

    if (googleDriveService.isAvailable()) {
      try {
        const fileName = `certificado-${certificate.certificateNumber}.pdf`;
        googleDriveFileId = await googleDriveService.uploadFile(pdfBuffer, fileName, certificate.certificateNumber);
      } catch (error) {
        const err = error as Error;
        console.warn('⚠️ Error subiendo a Google Drive (continuando sin guardar):', err.message);
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
    return await certificatePostgresService.getCertificateById(certificateId) as Certificate;
  }

  /**
   * Obtiene el PDF de un certificado desde Google Drive o lo genera si no existe
   */
  async generateCertificatePDF(certificateId: string | number, userId: string | null = null): Promise<Buffer> {
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
        const err = error as Error;
        console.warn('⚠️ Error descargando de Google Drive, regenerando:', err.message);
      }
    }

    // 2. Si no existe en Google Drive, generarlo
    
    // Si Google Drive no está disponible, generar y devolver directamente
    if (!googleDriveService.isAvailable()) {
      
      // Obtener información del emisor
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id || '')
        : (certificate.issuerId || certificate.emisorId || '');
      const issuer = await userService.getUserById(issuerIdValue as string);
      const issuerName = issuer?.name || 'Movilis';

      // Obtener datos del destinatario
      // Si se proporciona userId, usar ese usuario (para PDF personalizado por usuario)
      // Si no, usar el destinatario principal del certificado
      const recipientIdNameValue = typeof certificate.recipientId === 'object' && certificate.recipientId !== null
        ? certificate.recipientId.name
        : undefined;
      let recipientNameFromDB = certificate.recipientName || recipientIdNameValue || '';
      let recipientCedula: string | null = null;
      
      if (userId) {
        // Usar el usuario que está descargando
        try {
          const user = await userService.getUserById(userId);
          if (user) {
            recipientNameFromDB = user.name;
            recipientCedula = user.cedula;
          }
        } catch (error) {
          const err = error as Error;
          console.warn('No se pudo obtener usuario de PostgreSQL:', err.message);
        }
      } else {
        // Usar el destinatario principal
        const recipientUserIdValue = typeof certificate.recipientId === 'object' && certificate.recipientId !== null
          ? (certificate.recipientId._id || certificate.recipientId.id)
          : (certificate.recipientId || certificate.destinatarioId);
        if (recipientUserIdValue) {
          try {
            const user = await userService.getUserById(recipientUserIdValue as string);
            if (user) {
              recipientNameFromDB = user.name;
              recipientCedula = user.cedula;
            }
          } catch (error) {
            const err = error as Error;
            console.warn('No se pudo obtener usuario de PostgreSQL:', err.message);
          }
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
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await pdfService.generateCertificateFromTemplate(pdfData, recipientCedula);
      } catch (error) {
        const err = error as Error;
        console.warn('Error generando con plantilla, usando método alternativo:', err.message);
        pdfBuffer = await pdfService.generateCertificateBuffer(pdfData);
      }

      // Intentar firmar el PDF con el certificado configurado en .env
      try {
        pdfBuffer = await pdfService.signPDF(pdfBuffer, Buffer.alloc(0), '');
      } catch (error) {
        const err = error as Error;
        console.warn('⚠️ No se pudo firmar el certificado (continuando sin firma):', err.message);
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
    if (updatedCertificate?.googleDriveFileId && googleDriveService.isAvailable()) {
      try {
        return await googleDriveService.downloadFile(updatedCertificate.googleDriveFileId);
      } catch (error) {
        const err = error as Error;
        console.error('❌ Error descargando de Google Drive después de generar:', err.message);
        throw new Error('No se pudo obtener el PDF del certificado desde Google Drive');
      }
    }

    throw new Error('No se pudo obtener el PDF del certificado');
  }

  /**
   * Actualiza un certificado
   */
  async updateCertificate(certificateId: string | number, updateData: Partial<Certificate>): Promise<Certificate> {
    // Usar PostgreSQL directamente
    const result = await certificatePostgresService.updateCertificate(certificateId, updateData);
    if (!result) {
      throw new Error('Certificado no encontrado');
    }
    return result;
  }

  /**
   * Revoca un certificado
   */
  async revokeCertificate(certificateId: string | number): Promise<Certificate> {
    const result = await certificatePostgresService.updateCertificate(certificateId, { status: 'revoked' });
    if (!result) {
      throw new Error('Certificado no encontrado');
    }
    return result;
  }

  /**
   * Elimina un certificado
   */
  async deleteCertificate(certificateId: string | number): Promise<boolean> {
    // Usar PostgreSQL directamente
    return await certificatePostgresService.deleteCertificate(certificateId);
  }

  /**
   * Verifica un certificado por código de verificación
   */
  async verifyCertificate(verificationCode: string): Promise<VerifyResult> {
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

    // Verificar si está expirado
    if (certificate.expirationDate) {
      const expirationDate = new Date(certificate.expirationDate);
      const now = new Date();
      if (expirationDate < now) {
        return {
          valid: false,
          message: 'Certificado expirado',
          certificate: certificate
        };
      }
    }

    return {
      valid: true,
      message: 'Certificado válido',
      certificate: certificate
    };
  }

  /**
   * Obtiene estadísticas de certificados
   */
  async getStatistics(issuerId: string | null = null): Promise<Statistics> {
    // Usar PostgreSQL directamente
    return await certificatePostgresService.getStatistics(issuerId);
  }

  /**
   * Asigna un certificado a uno o más usuarios
   */
  async assignCertificateToUsers(certificateId: string | number, userIds: string[], assignedBy: string | null = null): Promise<unknown[]> {
    return await certificatePostgresService.assignCertificateToUsers(certificateId, userIds, assignedBy);
  }

  /**
   * Desasigna un certificado de un usuario
   */
  async unassignCertificateFromUser(certificateId: string | number, userId: string): Promise<boolean> {
    return await certificatePostgresService.unassignCertificateFromUser(certificateId, userId);
  }

  /**
   * Obtiene todos los usuarios asignados a un certificado
   */
  async getCertificateUsers(certificateId: string | number): Promise<unknown[]> {
    return await certificatePostgresService.getCertificateUsers(certificateId);
  }
}

export default new CertificateService();

