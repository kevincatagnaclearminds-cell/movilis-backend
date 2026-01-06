import prisma from '../../../config/prisma';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4: uuidv4 } = require('uuid');
import { Certificate } from '../../../types';
import type { certificados_usuarios, certificados } from '../../../generated/prisma/client';

interface AssignedUser {
  id: string;
  name: string;
  email?: string;
  cedula?: string;
}

interface CertificateFilters {
  status?: string;
  recipientEmail?: string;
  issuerId?: string;
}

interface CertificateOptions {
  page?: number | string;
  limit?: number | string;
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

interface Statistics {
  total: number;
  issued: number;
  revoked: number;
  expired: number;
  draft: number;
  byStatus: Record<string, number>;
}

class CertificatePrismaService {
  /**
   * Crea un nuevo certificado
   */
  async createCertificate(certificateData: Partial<Certificate> & { userIds?: string[] }): Promise<Certificate> {
    try {
      const numeroCertificado = certificateData.numeroCertificado || `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const codigoVerificacion = certificateData.codigoVerificacion || uuidv4();

      const emisorId = typeof certificateData.issuerId === 'object' && certificateData.issuerId !== null && !Array.isArray(certificateData.issuerId)
        ? (certificateData.issuerId._id || certificateData.issuerId.id || '')
        : (certificateData.emisorId || (typeof certificateData.issuerId === 'string' ? certificateData.issuerId : '') || '');

      let destinatarioId = '';
      
      // Verificar destinatarioId como objeto
      if (certificateData.destinatarioId && typeof certificateData.destinatarioId === 'object' && !Array.isArray(certificateData.destinatarioId)) {
        destinatarioId = (certificateData.destinatarioId as { _id?: string; id?: string })._id || 
                         (certificateData.destinatarioId as { _id?: string; id?: string }).id || '';
      } 
      // Verificar recipientId como objeto
      else if (certificateData.recipientId && typeof certificateData.recipientId === 'object' && !Array.isArray(certificateData.recipientId)) {
        destinatarioId = (certificateData.recipientId as { _id?: string; id?: string })._id || 
                         (certificateData.recipientId as { _id?: string; id?: string }).id || '';
      }
      // Usar valores string directos
      else {
        destinatarioId = (typeof certificateData.destinatarioId === 'string' ? certificateData.destinatarioId : '') ||
                         (typeof certificateData.recipientId === 'string' ? certificateData.recipientId : '') ||
                         '';
      }

      // Convertir fechas a objetos Date si son strings
      const fechaEmision = certificateData.fechaEmision || certificateData.issueDate || new Date();
      const fechaEmisionDate = fechaEmision instanceof Date 
        ? fechaEmision 
        : (typeof fechaEmision === 'string' ? new Date(fechaEmision) : new Date());

      let fechaExpiracionDate: Date | null = null;
      const fechaExpiracion = certificateData.fechaExpiracion || certificateData.expirationDate;
      if (fechaExpiracion) {
        fechaExpiracionDate = fechaExpiracion instanceof Date 
          ? fechaExpiracion 
          : (typeof fechaExpiracion === 'string' ? new Date(fechaExpiracion) : null);
      }

      // Crear el certificado
      const certificate = await prisma.certificados.create({
        data: {
          numero_certificado: numeroCertificado,
          codigo_verificacion: codigoVerificacion,
          nombre_curso: certificateData.nombreCurso || certificateData.courseName || '',
          institucion: certificateData.institucion || 'Movilis',
          fecha_emision: fechaEmisionDate,
          destinatario_id: destinatarioId,
          emisor_id: emisorId,
          fecha_expiracion: fechaExpiracionDate,
          estado: certificateData.estado || certificateData.status || 'draft',
          drive_file_id: certificateData.driveFileId || certificateData.googleDriveFileId || null
        },
        include: {
          users_certificados_emisor_idTousers: true,
          users_certificados_destinatario_idTousers: true,
          certificados_usuarios: {
            include: {
              users: true
            }
          }
        }
      });

      // Si se proporcionaron usuarios para asignar, asignarlos
      const userIds = certificateData.userIds || 
        (certificateData.destinatarioId || certificateData.recipientId ? [certificateData.destinatarioId || certificateData.recipientId as string] : []);

      if (userIds.length > 0) {
        await this.assignCertificateToUsers(certificate.id, userIds, emisorId);
      }

      // Obtener el certificado completo con usuarios asignados
      return await this.getCertificateById(certificate.id) as Certificate;
    } catch (error: any) {
      if (error.code === 'P2002') { // Prisma unique constraint violation
        throw new Error('El número de certificado o código de verificación ya existe');
      }
      throw error;
    }
  }

  /**
   * Obtiene un certificado por ID
   */
  async getCertificateById(certificateId: string | number): Promise<Certificate | null> {
    try {
      const certId = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      
      const certificate = await prisma.certificados.findUnique({
        where: { id: certId },
        include: {
          users_certificados_emisor_idTousers: true,
          users_certificados_destinatario_idTousers: true,
          certificados_usuarios: {
            include: {
              users: true
            },
            orderBy: {
              asignado_en: 'desc'
            }
          }
        }
      });

      if (!certificate) {
        return null;
      }

      const assignedUsers: AssignedUser[] = certificate.certificados_usuarios.map((cu: certificados_usuarios & { users: { id: string; name: string; email: string | null; cedula: string } }) => ({
        id: cu.users.id,
        name: cu.users.name,
        email: cu.users.email || undefined,
        cedula: cu.users.cedula
      }));

      return this.mapToCertificate(certificate, assignedUsers);
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo certificado por ID:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene un certificado por número
   */
  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | null> {
    try {
      const certificate = await prisma.certificados.findUnique({
        where: { numero_certificado: certificateNumber },
        include: {
          users_certificados_emisor_idTousers: true,
          users_certificados_destinatario_idTousers: true,
          certificados_usuarios: {
            include: {
              users: true
            }
          }
        }
      });

      if (!certificate) {
        return null;
      }

      const assignedUsers: AssignedUser[] = certificate.certificados_usuarios.map((cu: certificados_usuarios & { users: { id: string; name: string; email: string | null; cedula: string } }) => ({
        id: cu.users.id,
        name: cu.users.name,
        email: cu.users.email || undefined,
        cedula: cu.users.cedula
      }));

      return this.mapToCertificate(certificate, assignedUsers);
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo certificado por número:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene un certificado por código de verificación
   */
  async getCertificateByVerificationCode(verificationCode: string): Promise<Certificate | null> {
    try {
      const certificate = await prisma.certificados.findUnique({
        where: { codigo_verificacion: verificationCode },
        include: {
          users_certificados_emisor_idTousers: true,
          users_certificados_destinatario_idTousers: true,
          certificados_usuarios: {
            include: {
              users: true
            }
          }
        }
      });

      if (!certificate) {
        return null;
      }

      const assignedUsers: AssignedUser[] = certificate.certificados_usuarios.map((cu: certificados_usuarios & { users: { id: string; name: string; email: string | null; cedula: string } }) => ({
        id: cu.users.id,
        name: cu.users.name,
        email: cu.users.email || undefined,
        cedula: cu.users.cedula
      }));

      return this.mapToCertificate(certificate, assignedUsers);
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo certificado por código:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene todos los certificados con filtros (para admin)
   */
  async getAllCertificates(filters: CertificateFilters = {}, options: CertificateOptions = {}): Promise<CertificatesResult> {
    try {
      const page = parseInt(String(options.page || 1));
      const limit = parseInt(String(options.limit || 10));
      const skip = (page - 1) * limit;

      // Construir where clause
      const where: any = {};
      
      if (filters.status) {
        where.estado = filters.status;
      }
      
      if (filters.issuerId) {
        where.emisor_id = filters.issuerId;
      }

      if (filters.recipientEmail) {
        where.users_certificados_destinatario_idTousers = {
          email: filters.recipientEmail
        };
      }

      // Mapear sortBy
      const sortByMap: Record<string, any> = {
        'createdAt': 'creado_en',
        'creado_en': 'creado_en',
        'issueDate': 'fecha_emision',
        'fecha_emision': 'fecha_emision',
        'courseName': 'nombre_curso',
        'nombre_curso': 'nombre_curso'
      };
      
      const orderBy: any = {};
      const sortField = sortByMap[options.sortBy || 'creado_en'] || 'creado_en';
      orderBy[sortField] = (options.sortOrder || 'DESC').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const [certificates, total] = await Promise.all([
        prisma.certificados.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            users_certificados_emisor_idTousers: true,
            users_certificados_destinatario_idTousers: true,
            certificados_usuarios: {
              include: {
                users: true
              }
            }
          }
        }),
        prisma.certificados.count({ where })
      ]);

      const mappedCertificates = await Promise.all(
        certificates.map(async (cert: certificados & { certificados_usuarios: Array<certificados_usuarios & { users: { id: string; name: string; email: string | null; cedula: string } }> }) => {
          const assignedUsers: AssignedUser[] = cert.certificados_usuarios.map(cu => ({
            id: cu.users.id,
            name: cu.users.name,
            email: cu.users.email || undefined,
            cedula: cu.users.cedula
          }));
          return this.mapToCertificate(cert, assignedUsers);
        })
      );

      return {
        certificates: mappedCertificates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo todos los certificados:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene certificados por destinatario (email)
   */
  async getCertificatesByRecipient(recipientEmail: string, options: CertificateOptions = {}): Promise<CertificatesResult> {
    try {
      const page = parseInt(String(options.page || 1));
      const limit = parseInt(String(options.limit || 10));
      const skip = (page - 1) * limit;

      // Buscar usuario por email
      const user = await prisma.users.findFirst({
        where: {
          email: recipientEmail,
          is_active: true
        }
      });

      if (!user) {
        return {
          certificates: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        };
      }

      // Buscar certificados asignados a este usuario
      // Mapear campos de ordenamiento para certificados_usuarios
      const sortOrder = (options.sortOrder || 'DESC').toLowerCase() === 'asc' ? 'asc' : 'desc';
      
      // Construir orderBy según el campo solicitado
      let orderBy: any = {};
      const sortBy = options.sortBy || 'asignado_en';
      
      if (sortBy === 'createdAt' || sortBy === 'creado_en') {
        // Ordenar por fecha de asignación (asignado_en)
        orderBy = { asignado_en: sortOrder };
      } else if (sortBy === 'issueDate' || sortBy === 'fecha_emision') {
        // Ordenar por fecha de emisión del certificado (a través de la relación)
        orderBy = { certificados: { fecha_emision: sortOrder } };
      } else if (sortBy === 'courseName' || sortBy === 'nombre_curso') {
        // Ordenar por nombre del curso (a través de la relación)
        orderBy = { certificados: { nombre_curso: sortOrder } };
      } else {
        // Por defecto, ordenar por fecha de asignación
        orderBy = { asignado_en: sortOrder };
      }

      const [certificadosUsuarios, total] = await Promise.all([
        prisma.certificados_usuarios.findMany({
          where: {
            usuario_id: user.id
          },
          skip,
          take: limit,
          include: {
            certificados: {
              include: {
                users_certificados_emisor_idTousers: true,
                users_certificados_destinatario_idTousers: true,
                certificados_usuarios: {
                  include: {
                    users: true
                  }
                }
              }
            }
          },
          orderBy
        }),
        prisma.certificados_usuarios.count({
          where: {
            usuario_id: user.id
          }
        })
      ]);

      const certificates = certificadosUsuarios.map((cu) => {
        const cert = cu.certificados;
        const assignedUsers: AssignedUser[] = cert.certificados_usuarios.map((cuInner) => ({
          id: cuInner.users.id,
          name: cuInner.users.name,
          email: cuInner.users.email || undefined,
          cedula: cuInner.users.cedula
        }));
        return this.mapToCertificate(cert, assignedUsers);
      });

      return {
        certificates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo certificados por destinatario:', err.message);
      return {
        certificates: [],
        pagination: {
          page: parseInt(String(options.page || 1)),
          limit: parseInt(String(options.limit || 10)),
          total: 0,
          pages: 0
        }
      };
    }
  }

  /**
   * Actualiza un certificado
   */
  async updateCertificate(certificateId: string | number, updateData: Partial<Certificate>): Promise<Certificate | null> {
    try {
      const certId = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      
      const updatePayload: any = {};

      if (updateData.destinatarioId || updateData.recipientId) {
        updatePayload.destinatario_id = updateData.destinatarioId || updateData.recipientId;
      }

      if (updateData.courseName || updateData.nombreCurso) {
        updatePayload.nombre_curso = updateData.courseName || updateData.nombreCurso;
      }

      if (updateData.institucion) {
        updatePayload.institucion = updateData.institucion;
      }

      if (updateData.expirationDate !== undefined || updateData.fechaExpiracion !== undefined) {
        const fechaExpiracion = updateData.expirationDate || updateData.fechaExpiracion;
        if (fechaExpiracion === null) {
          updatePayload.fecha_expiracion = null;
        } else {
          updatePayload.fecha_expiracion = fechaExpiracion instanceof Date 
            ? fechaExpiracion 
            : (typeof fechaExpiracion === 'string' ? new Date(fechaExpiracion) : null);
        }
      }

      if (updateData.status || updateData.estado) {
        updatePayload.estado = updateData.estado || updateData.status;
      }

      if (updateData.googleDriveFileId || updateData.driveFileId) {
        updatePayload.drive_file_id = updateData.driveFileId || updateData.googleDriveFileId;
      }

      if (Object.keys(updatePayload).length === 0) {
        return await this.getCertificateById(certId);
      }

      const certificate = await prisma.certificados.update({
        where: { id: certId },
        data: updatePayload,
        include: {
          users_certificados_emisor_idTousers: true,
          users_certificados_destinatario_idTousers: true,
          certificados_usuarios: {
            include: {
              users: true
            }
          }
        }
      });

      const assignedUsers: AssignedUser[] = certificate.certificados_usuarios.map((cu: certificados_usuarios & { users: { id: string; name: string; email: string | null; cedula: string } }) => ({
        id: cu.users.id,
        name: cu.users.name,
        email: cu.users.email || undefined,
        cedula: cu.users.cedula
      }));

      return this.mapToCertificate(certificate, assignedUsers);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null;
      }
      const err = error as Error;
      console.error('Error actualizando certificado:', err.message);
      throw error;
    }
  }

  /**
   * Mapea un registro de Prisma a formato de certificado
   */
  mapToCertificate(cert: any, assignedUsers: AssignedUser[] = []): Certificate {
    // Si no hay usuarios asignados pero hay destinatario_id, crear array con uno
    let users = assignedUsers;
    if (users.length === 0 && cert.destinatario_id && cert.users_certificados_destinatario_idTousers) {
      users = [{
        id: cert.destinatario_id,
        name: cert.users_certificados_destinatario_idTousers.name || '',
        email: cert.users_certificados_destinatario_idTousers.email || undefined,
        cedula: cert.users_certificados_destinatario_idTousers.cedula
      }];
    }

    const primaryRecipient = users.length > 0 ? users[0] : null;

    return {
      _id: String(cert.id),
      id: cert.id,
      certificateNumber: cert.numero_certificado,
      numeroCertificado: cert.numero_certificado,
      verificationCode: cert.codigo_verificacion,
      codigoVerificacion: cert.codigo_verificacion,
      courseName: cert.nombre_curso,
      nombreCurso: cert.nombre_curso,
      institucion: cert.institucion,
      description: undefined,
      descripcion: undefined,
      recipientId: primaryRecipient ? {
        _id: primaryRecipient.id,
        id: primaryRecipient.id,
        name: primaryRecipient.name,
        email: primaryRecipient.email
      } : null,
      destinatarioId: primaryRecipient ? primaryRecipient.id : cert.destinatario_id,
      recipientName: primaryRecipient ? primaryRecipient.name : (cert.users_certificados_destinatario_idTousers?.name || ''),
      destinatarioNombre: primaryRecipient ? primaryRecipient.name : (cert.users_certificados_destinatario_idTousers?.name || ''),
      recipientEmail: primaryRecipient ? primaryRecipient.email : (cert.users_certificados_destinatario_idTousers?.email || ''),
      destinatarioEmail: primaryRecipient ? primaryRecipient.email : (cert.users_certificados_destinatario_idTousers?.email || ''),
      assignedUsers: users.map(u => ({
        _id: u.id,
        id: u.id,
        name: u.name,
        email: u.email,
        cedula: u.cedula
      })),
      usuariosAsignados: users.map(u => ({
        _id: u.id,
        id: u.id,
        name: u.name,
        email: u.email,
        cedula: u.cedula
      })),
      issuerId: {
        _id: cert.emisor_id,
        id: cert.emisor_id,
        name: cert.users_certificados_emisor_idTousers?.name || '',
        email: cert.users_certificados_emisor_idTousers?.email || ''
      },
      emisorId: cert.emisor_id,
      issueDate: cert.fecha_emision,
      fechaEmision: cert.fecha_emision,
      expirationDate: cert.fecha_expiracion,
      fechaExpiracion: cert.fecha_expiracion,
      status: cert.estado as 'draft' | 'issued' | 'revoked' | 'expired',
      estado: cert.estado as 'draft' | 'issued' | 'revoked' | 'expired',
      googleDriveFileId: cert.drive_file_id,
      driveFileId: cert.drive_file_id,
      createdAt: cert.creado_en,
      creadoEn: cert.creado_en,
      isVerified: cert.estado === 'issued'
    };
  }

  /**
   * Asigna un certificado a uno o más usuarios
   */
  async assignCertificateToUsers(certificateId: string | number, userIds: string[], assignedBy: string | null = null): Promise<unknown[]> {
    try {
      const certId = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      const assignments: unknown[] = [];
      
      for (const userId of userIds) {
        try {
          const assignment = await prisma.certificados_usuarios.upsert({
            where: {
              certificado_id_usuario_id: {
                certificado_id: certId,
                usuario_id: userId
              }
            },
            update: {},
            create: {
              certificado_id: certId,
              usuario_id: userId,
              asignado_por: assignedBy
            }
          });
          assignments.push(assignment);
        } catch (error: any) {
          // Ignorar errores de conflicto único (ya existe)
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
      
      return assignments;
    } catch (error) {
      const err = error as Error;
      console.error('Error asignando certificado a usuarios:', err.message);
      throw error;
    }
  }

  /**
   * Desasigna un certificado de un usuario
   */
  async unassignCertificateFromUser(certificateId: string | number, userId: string): Promise<boolean> {
    try {
      const certId = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      
      const result = await prisma.certificados_usuarios.deleteMany({
        where: {
          certificado_id: certId,
          usuario_id: userId
        }
      });
      
      return result.count > 0;
    } catch (error) {
      const err = error as Error;
      console.error('Error desasignando certificado:', err.message);
      throw error;
    }
  }

  /**
   * Verifica si un usuario está asignado a un certificado
   */
  async isUserAssignedToCertificate(certificateId: string | number, userId: string): Promise<boolean> {
    try {
      const certId = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      
      const count = await prisma.certificados_usuarios.count({
        where: {
          certificado_id: certId,
          usuario_id: userId
        }
      });
      
      return count > 0;
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error verificando asignación de usuario:', err.message);
      return false;
    }
  }

  /**
   * Obtiene todos los usuarios asignados a un certificado
   */
  async getCertificateUsers(certificateId: string | number): Promise<unknown[]> {
    try {
      const certId = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      
      const certificadosUsuarios = await prisma.certificados_usuarios.findMany({
        where: {
          certificado_id: certId
        },
        include: {
          users: true
        },
        orderBy: {
          asignado_en: 'desc'
        }
      });
      
      return certificadosUsuarios.map((cu) => ({
        _id: cu.users.id,
        id: cu.users.id,
        cedula: cu.users.cedula,
        name: cu.users.name,
        email: cu.users.email,
        role: cu.users.role,
        isActive: cu.users.is_active,
        assignedAt: cu.asignado_en,
        assignedBy: cu.asignado_por
      }));
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo usuarios del certificado:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene todos los certificados asignados a un usuario
   */
  async getCertificatesByUser(userId: string, options: CertificateOptions = {}): Promise<CertificatesResult> {
    try {
      const page = parseInt(String(options.page || 1));
      const limit = parseInt(String(options.limit || 10));
      const skip = (page - 1) * limit;

      // Construir orderBy según el campo solicitado
      const sortOrder = (options.sortOrder || 'DESC').toLowerCase() === 'asc' ? 'asc' : 'desc';
      let orderBy: any = {};
      const sortBy = options.sortBy || 'asignado_en';
      
      if (sortBy === 'createdAt' || sortBy === 'creado_en') {
        // Ordenar por fecha de asignación (asignado_en)
        orderBy = { asignado_en: sortOrder };
      } else if (sortBy === 'issueDate' || sortBy === 'fecha_emision') {
        // Ordenar por fecha de emisión del certificado (a través de la relación)
        orderBy = { certificados: { fecha_emision: sortOrder } };
      } else if (sortBy === 'courseName' || sortBy === 'nombre_curso') {
        // Ordenar por nombre del curso (a través de la relación)
        orderBy = { certificados: { nombre_curso: sortOrder } };
      } else {
        // Por defecto, ordenar por fecha de asignación
        orderBy = { asignado_en: sortOrder };
      }

      const [certificadosUsuarios, total] = await Promise.all([
        prisma.certificados_usuarios.findMany({
          where: {
            usuario_id: userId
          },
          skip,
          take: limit,
          include: {
            certificados: {
              include: {
                users_certificados_emisor_idTousers: true,
                certificados_usuarios: {
                  include: {
                    users: true
                  }
                }
              }
            }
          },
          orderBy
        }),
        prisma.certificados_usuarios.count({
          where: {
            usuario_id: userId
          }
        })
      ]);

      const certificates = certificadosUsuarios.map((cu: certificados_usuarios & { certificados: certificados & { certificados_usuarios: Array<certificados_usuarios & { users: { id: string; name: string; email: string | null; cedula: string } }> } }) => {
        const assignedUsers: AssignedUser[] = cu.certificados.certificados_usuarios.map((cuInner: certificados_usuarios & { users: { id: string; name: string; email: string | null; cedula: string } }) => ({
          id: cuInner.users.id,
          name: cuInner.users.name,
          email: cuInner.users.email || undefined,
          cedula: cuInner.users.cedula
        }));
        return this.mapToCertificate(cu.certificados, assignedUsers);
      });

      return {
        certificates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo certificados por usuario:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de certificados
   */
  async getStatistics(issuerId: string | null = null): Promise<Statistics> {
    try {
      const where: any = {};
      
      if (issuerId) {
        where.emisor_id = issuerId;
      }

      const certificates = await prisma.certificados.groupBy({
        by: ['estado'],
        where,
        _count: {
          estado: true
        }
      });

      const stats: Record<string, number> = {};
      let total = 0;
      
      certificates.forEach((cert: { estado: string; _count: { estado: number } }) => {
        const count = cert._count.estado;
        stats[cert.estado] = count;
        total += count;
      });
      
      return {
        total,
        issued: stats.issued || 0,
        revoked: stats.revoked || 0,
        expired: stats.expired || 0,
        draft: stats.draft || 0,
        byStatus: stats
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error obteniendo estadísticas:', err.message);
      throw error;
    }
  }

  /**
   * Elimina un certificado
   */
  async deleteCertificate(certificateId: string | number): Promise<boolean> {
    try {
      const certId = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      
      await prisma.certificados.delete({
        where: { id: certId }
      });
      
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false;
      }
      const err = error as Error;
      console.error('Error eliminando certificado:', err.message);
      throw error;
    }
  }
}

export default new CertificatePrismaService();

