import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest, ApiResponse, Certificate } from '../../../types';
import certificateService from '../services/certificate.service';
import certificatePostgresService from '../services/certificate.prisma.service';

class CertificateController {
  /**
   * Crear un certificado rápidamente (versión simplificada para admin)
   */
  async createCertificateQuick(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      // Valores por defecto para creación rápida
      const certificateData: Partial<Certificate> & { userIds?: string[] } = {
        courseName: req.body.courseName,
        nombreCurso: req.body.courseName,
        institucion: req.body.institucion || 'Movilis',
        emisorId: req.user._id,
        issuerId: req.user._id,
        status: 'draft' as 'draft' | 'issued' | 'revoked' | 'expired',
        estado: 'draft' as 'draft' | 'issued' | 'revoked' | 'expired',
        // Destinatario
        destinatarioId: req.body.destinatarioId || req.body.recipientId || undefined,
        recipientId: req.body.recipientId || req.body.destinatarioId || undefined,
        // Múltiples usuarios
        userIds: req.body.userIds || (req.body.destinatarioId || req.body.recipientId ? [req.body.destinatarioId || req.body.recipientId] : []),
        // Fecha de expiración opcional
        expirationDate: req.body.expirationDate || null,
        fechaExpiracion: req.body.expirationDate || null,
        // Descripción opcional
        courseDescription: req.body.courseDescription || req.body.description || '',
        description: req.body.description || req.body.courseDescription || '',
        // Metadatos opcionales
        metadata: req.body.metadata || {}
      };

      const certificate = await certificateService.createCertificate(certificateData);

      const response: ApiResponse<Certificate> = {
        success: true,
        data: certificate,
        message: 'Certificado creado exitosamente'
      };
      res.status(201).json(response);
    } catch (error) {
      // Manejo específico de errores de validación de UUID
      const err = error as Error;
      if (err.message && (err.message.includes('UUID válido') || err.message.includes('inválido') || err.message.includes('vacío'))) {
        console.warn('⚠️ [Controller] Validación fallida:', err.message);
        res.status(400).json({
          success: false,
          error: {
            message: 'Datos de entrada inválidos: destinatario es requerido',
            details: err.message
          }
        });
        return;
      }
      // Propagar otros errores al middleware de manejo de errores
      next(error);
    }
  }

  /**
   * Crear un nuevo certificado
   */
  async createCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificateData = {
        ...req.body,
        emisorId: req.user._id,
        issuerId: req.user._id
      };

      // Si se proporciona destinatarioId o recipientId, convertirlo a userIds para compatibilidad
      if (req.body.destinatarioId || req.body.recipientId) {
        const userId = req.body.destinatarioId || req.body.recipientId;
        certificateData.userIds = [userId];
      }

      const certificate = await certificateService.createCertificate(certificateData);

      const response: ApiResponse<Certificate> = {
        success: true,
        data: certificate,
        message: 'Certificado creado exitosamente'
      };
      res.status(201).json(response);
    } catch (error) {
      // Manejo específico de errores de validación de UUID
      const err = error as Error;
      if (err.message && (err.message.includes('UUID válido') || err.message.includes('inválido') || err.message.includes('vacío'))) {
        console.warn('⚠️ [Controller] Validación fallida:', err.message);
        res.status(400).json({
          success: false,
          error: {
            message: 'Datos de entrada inválidos',
            details: err.message
          }
        });
        return;
      }
      // Propagar otros errores al middleware de manejo de errores
      next(error);
    }
  }

  /**
   * Obtener todos los certificados
   */
  async getCertificates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const filters: Record<string, unknown> = {};
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as string) || 'desc'
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

      const response: ApiResponse<Certificate[]> = {
        success: true,
        data: result.certificates,
        pagination: result.pagination
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener un certificado por ID
   */
  async getCertificateById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      // Convertir ID a número si es string numérico (PostgreSQL usa SERIAL)
      const certificateId = isNaN(req.params.id as any) ? req.params.id : parseInt(req.params.id);
      const certificate = await certificateService.getCertificateById(certificateId);

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos (solo admin o el emisor puede ver)
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
      if (req.user.role !== 'admin' && 
          String(issuerIdValue) !== String(req.user._id)) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado para ver este certificado' }
        });
        return;
      }

      const response: ApiResponse<Certificate> = {
        success: true,
        data: certificate
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener un certificado por número
   */
  async getCertificateByNumber(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const certificate = await certificateService.getCertificateByNumber(req.params.number);

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      const response: ApiResponse<Certificate> = {
        success: true,
        data: certificate
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar un certificado
   */
  async updateCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
      if (req.user.role !== 'admin' && 
          String(issuerIdValue) !== String(req.user._id)) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado para actualizar este certificado' }
        });
        return;
      }

      const updatedCertificate = await certificateService.updateCertificate(
        req.params.id,
        req.body
      );

      const response: ApiResponse<Certificate> = {
        success: true,
        data: updatedCertificate,
        message: 'Certificado actualizado exitosamente'
      };
      res.json(response);
    } catch (error) {
      const err = error as Error;
      if (err.message === 'No se puede actualizar un certificado ya emitido') {
        res.status(400).json({
          success: false,
          error: { message: err.message }
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Emitir un certificado (generar PDF)
   */
  async issueCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
      if (req.user.role !== 'admin' && 
          String(issuerIdValue) !== String(req.user._id)) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado para emitir este certificado' }
        });
        return;
      }

      const issuedCertificate = await certificateService.issueCertificate(
        req.params.id,
        { issuerName: req.user.name }
      );

      const response: ApiResponse<Certificate> = {
        success: true,
        data: issuedCertificate,
        message: 'Certificado emitido exitosamente'
      };
      res.json(response);
    } catch (error) {
      const err = error as Error;
      if (err.message === 'El certificado ya ha sido emitido') {
        res.status(400).json({
          success: false,
          error: { message: err.message }
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Descargar PDF del certificado
   */
  async downloadCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('⬇️ [Download] Iniciando descarga de certificado');
      if (!req.user) {
        console.error('❌ [Download] Usuario no autenticado');
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificateId = isNaN(req.params.id as any) ? req.params.id : parseInt(req.params.id);
      console.log(`[Download] ID recibido:`, certificateId);

      if (String(certificateId).startsWith('cert-demo-')) {
        console.warn(`[Download] Intento de descarga de demo: ${certificateId}`);
        res.status(400).json({
          success: false,
          error: { message: 'Este es un certificado de demostración. Los certificados reales se obtienen desde la base de datos.' }
        });
        return;
      }

      const certificate = await certificateService.getCertificateById(certificateId);
      console.log(`[Download] Certificado encontrado:`, !!certificate);

      if (!certificate) {
        console.error(`[Download] Certificado no encontrado: ${certificateId}`);
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos
      if (req.user.role === 'admin') {
        console.log(`[Download] Usuario admin, acceso permitido`);
      } else {
        const userId = String(req.user._id);
        const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
          ? (certificate.issuerId._id || certificate.issuerId.id)
          : (certificate.issuerId || certificate.emisorId);
        const isIssuer = issuerIdValue && String(issuerIdValue) === userId;
        const certIdForQuery = typeof certificateId === 'string' && !isNaN(certificateId as any) 
          ? parseInt(certificateId) 
          : certificateId;
        const isAssignedUser = await certificatePostgresService.isUserAssignedToCertificate(certIdForQuery, req.user._id);
        const recipientIdValue = typeof certificate.recipientId === 'object' && certificate.recipientId !== null
          ? (certificate.recipientId._id || certificate.recipientId.id)
          : (certificate.recipientId || certificate.destinatarioId);
        const isRecipient = recipientIdValue && String(recipientIdValue) === userId;
        console.log(`[Download] Permisos: isIssuer=${isIssuer}, isAssignedUser=${isAssignedUser}, isRecipient=${isRecipient}`);
        if (!isIssuer && !isAssignedUser && !isRecipient) {
          console.warn(`[Download] Usuario no autorizado: ${userId}`);
          res.status(403).json({
            success: false,
            error: { message: 'No autorizado para descargar este certificado' }
          });
          return;
        }
      }

      // Obtener PDF desde Google Drive o generarlo si no existe
      console.log(`[Download] Generando o recuperando PDF para certificado: ${certificateId}`);
      const pdfBuffer = await certificateService.generateCertificatePDF(certificateId);
      console.log(`[Download] PDF generado. Tamaño: ${pdfBuffer.length} bytes`);

      // Obtener nombre de la firma del archivo P12 (si está disponible)
      let signerName = 'firma';
      try {
        // Intentar extraer el nombre del firmante del certificado P12
        const forge = require('node-forge');
        let p12Buffer = null;
        let p12Password = null;
        if (process.env.P12_BASE64 && process.env.P12_PASSWORD) {
          p12Buffer = Buffer.from(process.env.P12_BASE64, 'base64');
          p12Password = process.env.P12_PASSWORD;
        } else if (process.env.P12_PATH && process.env.P12_PASSWORD) {
          const fs = require('fs');
          if (fs.existsSync(process.env.P12_PATH)) {
            p12Buffer = fs.readFileSync(process.env.P12_PATH);
            p12Password = process.env.P12_PASSWORD;
          }
        }
        if (p12Buffer && p12Password) {
          const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
          const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, p12Password);
          const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
          if (certBags && certBags.length > 0) {
            const cert = certBags[0].cert;
            if (cert && cert.subject && cert.subject.attributes) {
              const cnAttr = cert.subject.attributes.find((attr: any) => attr.name === 'commonName');
              if (cnAttr && cnAttr.value) {
                signerName = cnAttr.value.replace(/[^a-zA-Z0-9_\-]/g, '_');
              }
            }
          }
        }
      } catch (err) {
        const error = err as Error;
        console.warn('[Download] No se pudo extraer el nombre de la firma del P12:', error.message);
      }

      const fileName = `certificado-${certificate.certificateNumber}-${signerName}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
      console.log(`[Download] PDF enviado correctamente al cliente. Nombre: ${fileName}`);
    } catch (error) {
      const err = error as Error & { stack?: string };
      console.error('❌ [Download] Error en descarga:', err.message);
      if (err.stack) {
        console.error('Stack:', err.stack);
      }
      next(error);
    }
  }

  /**
   * Ver certificado en el navegador (sin descargar)
   */
  async viewCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificateId = isNaN(req.params.id as any) ? req.params.id : parseInt(req.params.id);
      const certificate = await certificateService.getCertificateById(certificateId);

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos (misma lógica que downloadCertificate)
      if (req.user.role === 'admin') {
        // Permitir ver
      } else {
        const userId = String(req.user._id);
        
        // Verificar si es el emisor
        const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
        const isIssuer = issuerIdValue && String(issuerIdValue) === userId;
        
        // Verificar directamente en la base de datos si el usuario está asignado
        const isAssignedUser = await certificatePostgresService.isUserAssignedToCertificate(certificateId, req.user._id);
        
        // Verificar si es el destinatario principal o por email (compatibilidad)
        const recipientIdValue = typeof certificate.recipientId === 'object' && certificate.recipientId !== null
          ? (certificate.recipientId._id || certificate.recipientId.id)
          : (certificate.recipientId || certificate.destinatarioId);
        const isRecipient = (recipientIdValue && String(recipientIdValue) === userId) || (certificate.recipientEmail === req.user.email);
        
        if (!isIssuer && !isAssignedUser && !isRecipient) {
          res.status(403).json({
            success: false,
            error: { message: 'No autorizado para ver este certificado' }
          });
          return;
        }
      }

      // Generar PDF si no existe
      // Pasar el ID del usuario que está viendo para generar PDF personalizado
      const pdfBuffer = await certificateService.generateCertificatePDF(certificateId, req.user._id);
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
  async revokeCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Solo admin o el emisor puede revocar
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
      if (req.user.role !== 'admin' && 
          String(issuerIdValue) !== String(req.user._id)) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado para revocar este certificado' }
        });
        return;
      }

      const revokedCertificate = await certificateService.revokeCertificate(req.params.id);

      const response: ApiResponse<Certificate> = {
        success: true,
        data: revokedCertificate,
        message: 'Certificado revocado exitosamente'
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar un certificado
   */
  async deleteCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificate = await certificateService.getCertificateById(req.params.id);

      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Solo admin puede eliminar
      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: { message: 'Solo los administradores pueden eliminar certificados' }
        });
        return;
      }

      await certificateService.deleteCertificate(req.params.id);

      const response: ApiResponse = {
        success: true,
        message: 'Certificado eliminado exitosamente'
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verificar un certificado por código de verificación (público)
   */
  async verifyCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationCode } = req.params;
      const result = await certificateService.verifyCertificate(verificationCode);

      if (!result.valid) {
        res.status(400).json({
          success: false,
          data: result
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: result
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener estadísticas de certificados
   */
  async getStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      // Solo admin puede ver todas las estadísticas
      // Los emisores solo ven sus propias estadísticas
      const issuerId = req.user.role === 'admin' ? null : req.user._id;
      const statistics = await certificateService.getStatistics(issuerId);

      const response: ApiResponse = {
        success: true,
        data: statistics
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener certificados por destinatario (email)
   */
  async getCertificatesByRecipient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const recipientEmail = (req.query.email as string) || req.user.email;
      
      // Validar formato de email básico
      if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        res.status(400).json({
          success: false,
          error: { message: 'Formato de email inválido' }
        });
        return;
      }
      
      // Solo admin o el propio usuario puede ver sus certificados
      if (req.user.role !== 'admin' && recipientEmail !== req.user.email) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado' }
        });
        return;
      }

      // Normalizar sortOrder
      const rawSortOrder = (req.query.sortOrder as string) || 'desc';
      const normalizedSortOrder = rawSortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: normalizedSortOrder
      };

      // Usar Promise.race para timeout rápido
      const result = await Promise.race([
        certificateService.getCertificatesByRecipient(recipientEmail || '', options),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2000)
        )
      ]);

      const response: ApiResponse<Certificate[]> = {
        success: true,
        data: result.certificates || [],
        pagination: result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      };
      res.json(response);
    } catch (error) {
      const err = error as Error;
      console.error('Error en getCertificatesByRecipient:', err.message);
      console.error('Stack:', err.stack);
      
      // Si hay timeout, error de conexión o cualquier error de base de datos, devolver array vacío
      if (err.message && (
        err.message.includes('buffering timed out') || 
        err.message.includes('timeout') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('connection') ||
        err.message.includes('syntax error') ||
        err.message.includes('column') ||
        err.message.includes('relation')
      )) {
        const response: ApiResponse<Certificate[]> = {
          success: true,
          data: [],
          pagination: {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            total: 0,
            pages: 0
          }
        };
        res.json(response);
        return;
      }
      next(error);
    }
  }

  /**
   * Asignar usuarios a un certificado
   */
  async assignUsersToCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: { message: 'Datos inválidos', errors: errors.array() }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificateId = isNaN(req.params.id as any) ? req.params.id : parseInt(req.params.id);
      const { userIds } = req.body;

      const certificate = await certificateService.getCertificateById(certificateId);
      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
      if (req.user.role !== 'admin' && String(issuerIdValue) !== String(req.user._id)) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado para asignar usuarios a este certificado' }
        });
        return;
      }

      const assignments = await certificateService.assignCertificateToUsers(
        certificateId,
        userIds,
        req.user._id || ''
      );

      const response: ApiResponse = {
        success: true,
        data: {
          certificateId,
          assignedUsers: assignments,
          total: assignments.length
        },
        message: `${assignments.length} usuario(s) asignado(s) exitosamente`
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Desasignar un usuario de un certificado
   */
  async unassignUserFromCertificate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificateId = isNaN(req.params.id as any) ? req.params.id : parseInt(req.params.id);
      const { userId } = req.params;

      const certificate = await certificateService.getCertificateById(certificateId);
      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
      if (req.user.role !== 'admin' && String(issuerIdValue) !== String(req.user._id)) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado para desasignar usuarios de este certificado' }
        });
        return;
      }

      const unassigned = await certificateService.unassignCertificateFromUser(
        certificateId,
        userId
      );

      if (!unassigned) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuario no asignado a este certificado' }
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Usuario desasignado exitosamente'
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener usuarios asignados a un certificado
   */
  async getCertificateUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'No autenticado' }
        });
        return;
      }

      const certificateId = isNaN(req.params.id as any) ? req.params.id : parseInt(req.params.id);

      const certificate = await certificateService.getCertificateById(certificateId);
      if (!certificate) {
        res.status(404).json({
          success: false,
          error: { message: 'Certificado no encontrado' }
        });
        return;
      }

      // Verificar permisos
      const issuerIdValue = typeof certificate.issuerId === 'object' && certificate.issuerId !== null
        ? (certificate.issuerId._id || certificate.issuerId.id)
        : (certificate.issuerId || certificate.emisorId);
      if (req.user && req.user.role !== 'admin' && 
          String(issuerIdValue) !== String(req.user._id) &&
          !certificate.assignedUsers?.some(u => String(u.id) === String(req.user?._id))) {
        res.status(403).json({
          success: false,
          error: { message: 'No autorizado para ver usuarios de este certificado' }
        });
        return;
      }

      const users = await certificateService.getCertificateUsers(certificateId);

      const response: ApiResponse = {
        success: true,
        data: users
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new CertificateController();

