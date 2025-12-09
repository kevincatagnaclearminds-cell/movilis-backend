// @ts-nocheck
import { pool } from '../../../config/postgres';
// @ts-ignore - tipos de uuid resueltos en tiempo de ejecución
import { v4 as uuidv4 } from 'uuid';
import { Certificate } from '../../../types';

interface CertificateRow {
  id: number;
  numero_certificado: string;
  codigo_verificacion: string;
  nombre_curso: string;
  institucion: string;
  fecha_emision: Date;
  fecha_expiracion: Date | null;
  estado: string;
  destinatario_id: string | null;
  emisor_id: string;
  drive_file_id: string | null;
  creado_en: Date;
  emisor_nombre?: string;
  emisor_email?: string;
  destinatario_user_nombre?: string;
  destinatario_user_email?: string;
  destinatario_cedula?: string;
}

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

class CertificatePostgresService {
  /**
   * Crea un nuevo certificado
   */
  async createCertificate(certificateData: Partial<Certificate> & { userIds?: string[] }): Promise<Certificate> {
    try {
      const numeroCertificado = certificateData.numeroCertificado || `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const codigoVerificacion = certificateData.codigoVerificacion || uuidv4();

      // Crear el certificado sin destinatario_id (ahora es opcional)
      const result = await pool.query<CertificateRow>(
        `INSERT INTO certificados (
          numero_certificado, codigo_verificacion,
          nombre_curso, institucion, fecha_emision,
          destinatario_id, emisor_id, fecha_expiracion, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          numeroCertificado,
          codigoVerificacion,
          certificateData.nombreCurso || certificateData.courseName,
          certificateData.institucion || 'Movilis',
          certificateData.fechaEmision || certificateData.issueDate || new Date(),
          certificateData.destinatarioId || certificateData.recipientId || null,
          certificateData.emisorId || certificateData.issuerId,
          certificateData.fechaExpiracion || certificateData.expirationDate || null,
          certificateData.estado || certificateData.status || 'draft'
        ]
      );

      const certificate = result.rows[0];

      // Si se proporcionaron usuarios para asignar, asignarlos
      if (certificateData.userIds && Array.isArray(certificateData.userIds) && certificateData.userIds.length > 0) {
        const emisorIdValue = typeof certificateData.issuerId === 'object' && certificateData.issuerId !== null
          ? (certificateData.issuerId._id || certificateData.issuerId.id || '')
          : (certificateData.emisorId || certificateData.issuerId || '');
        await this.assignCertificateToUsers(
          certificate.id,
          certificateData.userIds,
          emisorIdValue as string
        );
      } else if (certificateData.destinatarioId || certificateData.recipientId) {
        // Compatibilidad: si se proporciona un solo destinatarioId, asignarlo
        const userId = certificateData.destinatarioId || certificateData.recipientId;
        const emisorIdValue = typeof certificateData.issuerId === 'object' && certificateData.issuerId !== null
          ? (certificateData.issuerId._id || certificateData.issuerId.id || '')
          : (certificateData.emisorId || certificateData.issuerId || '');
        await this.assignCertificateToUsers(
          certificate.id,
          [userId as string],
          emisorIdValue as string
        );
      }

      // Obtener el certificado completo con usuarios asignados
      return await this.getCertificateById(certificate.id) as Certificate;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
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
      // Obtener el certificado con información del emisor
      const result = await pool.query<CertificateRow>(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         WHERE c.id = $1`,
        [certificateId]
      );
      
      // Obtener todos los usuarios asignados a este certificado
      const usersResult = await pool.query<{
        id: string;
        name: string;
        email: string | null;
        cedula: string;
      }>(
        `SELECT u.id, u.name, u.email, u.cedula
         FROM certificados_usuarios cu
         INNER JOIN users u ON cu.usuario_id = u.id
         WHERE cu.certificado_id = $1`,
        [certificateId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const assignedUsers: AssignedUser[] = usersResult.rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email || undefined,
        cedula: u.cedula
      }));

      return this.mapToCertificate(result.rows[0], assignedUsers);
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
      const result = await pool.query<CertificateRow>(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         LEFT JOIN users u2 ON c.destinatario_id = u2.id
         WHERE c.numero_certificado = $1`,
        [certificateNumber]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCertificate(result.rows[0]);
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
      const result = await pool.query<CertificateRow>(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         LEFT JOIN users u2 ON c.destinatario_id = u2.id
         WHERE c.codigo_verificacion = $1`,
        [verificationCode]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCertificate(result.rows[0]);
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
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || 'creado_en';
      const sortOrder = options.sortOrder || 'DESC';

      // Mapear nombres de campos en inglés a español
      const sortByMap: Record<string, string> = {
        'createdAt': 'creado_en',
        'issueDate': 'fecha_emision',
        'courseName': 'nombre_curso',
        'recipientName': 'destinatario_user_nombre'
      };
      const mappedSortBy = sortByMap[sortBy] || sortBy;

      // Construir WHERE clause dinámicamente
      const whereConditions: string[] = [];
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      // Filtro por estado
      if (filters.status) {
        whereConditions.push(`c.estado = $${paramIndex++}`);
        queryParams.push(filters.status);
      }

      // Filtro por email del destinatario
      if (filters.recipientEmail) {
        whereConditions.push(`u2.email = $${paramIndex++}`);
        queryParams.push(filters.recipientEmail);
      }

      // Filtro por ID del emisor
      if (filters.issuerId) {
        whereConditions.push(`c.emisor_id = $${paramIndex++}`);
        queryParams.push(filters.issuerId);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query para obtener certificados
      const result = await pool.query<CertificateRow>(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         LEFT JOIN users u2 ON c.destinatario_id = u2.id
         ${whereClause}
         ORDER BY c.${mappedSortBy} ${sortOrder}
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...queryParams, limit, offset]
      );

      // Query para contar total
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         LEFT JOIN users u2 ON c.destinatario_id = u2.id
         ${whereClause}`,
        queryParams
      );

      const total = parseInt(countResult.rows[0].count);

      // Obtener usuarios asignados para cada certificado
      const certificates = await Promise.all(
        result.rows.map(async (row) => {
          const usersResult = await pool.query<{
            id: string;
            name: string;
            email: string | null;
            cedula: string;
          }>(
            `SELECT u.id, u.name, u.email, u.cedula
             FROM certificados_usuarios cu
             INNER JOIN users u ON cu.usuario_id = u.id
             WHERE cu.certificado_id = $1`,
            [row.id]
          );
          const assignedUsers: AssignedUser[] = usersResult.rows.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email || undefined,
            cedula: u.cedula
          }));
          return this.mapToCertificate(row, assignedUsers);
        })
      );

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
      console.error('Error obteniendo todos los certificados:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene certificados por destinatario (email)
   * Ahora usa la tabla intermedia certificados_usuarios
   */
  async getCertificatesByRecipient(recipientEmail: string, options: CertificateOptions = {}): Promise<CertificatesResult> {
    try {
      const page = parseInt(String(options.page || 1));
      const limit = parseInt(String(options.limit || 10));
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || 'creado_en';
      
      // Validar y normalizar sortOrder para evitar inyección SQL
      const rawSortOrder = (options.sortOrder || 'DESC').toUpperCase();
      const sortOrder = (rawSortOrder === 'ASC' || rawSortOrder === 'DESC') ? rawSortOrder : 'DESC';

      // Mapear nombres de campos en inglés a español
      const sortByMap: Record<string, string> = {
        'createdAt': 'c.creado_en',
        'issueDate': 'c.fecha_emision',
        'courseName': 'c.nombre_curso',
        'recipientName': 'u2.name'
      };
      const mappedSortBy = sortByMap[sortBy] || 'c.creado_en';

      // Buscar certificados usando la tabla intermedia certificados_usuarios
      // Primero obtener el ID del usuario por email
      const userResult = await pool.query<{ id: string }>(
        `SELECT id, name, email, cedula FROM users WHERE email = $1 AND is_active = true`,
        [recipientEmail]
      );

      if (userResult.rows.length === 0) {
        // Usuario no encontrado, retornar vacío
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

      const currentUser = userResult.rows[0];
      const userId = currentUser.id;

      // Buscar certificados asignados a este usuario usando certificados_usuarios
      const result = await pool.query<CertificateRow>(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email, u2.cedula as destinatario_cedula,
         cu.asignado_en
         FROM certificados c
         INNER JOIN certificados_usuarios cu ON c.id = cu.certificado_id
         INNER JOIN users u1 ON c.emisor_id = u1.id
         INNER JOIN users u2 ON cu.usuario_id = u2.id
         WHERE cu.usuario_id = $1
         ORDER BY ${mappedSortBy} ${sortOrder}
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM certificados c
         INNER JOIN certificados_usuarios cu ON c.id = cu.certificado_id
         WHERE cu.usuario_id = $1`,
        [userId]
      );

      const total = parseInt(countResult.rows[0].count);

      // Para cada certificado, obtener *todos* los usuarios asignados
      const certificates = await Promise.all(
        result.rows.map(async (row) => {
          const assignedUsersResult = await pool.query<{
            id: string;
            name: string;
            email: string | null;
            cedula: string;
          }>(
            `SELECT u.id, u.name, u.email, u.cedula
             FROM certificados_usuarios cu
             INNER JOIN users u ON cu.usuario_id = u.id
             WHERE cu.certificado_id = $1`,
            [row.id]
          );
          const assignedUsers: AssignedUser[] = assignedUsersResult.rows.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email || undefined,
            cedula: u.cedula
          }));
          return this.mapToCertificate(row, assignedUsers);
        })
      );

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
      console.error('Stack trace:', err.stack);
      // Retornar resultado vacío en lugar de lanzar error para evitar 500
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
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      // Actualizar destinatario (solo si se proporciona)
      if (updateData.destinatarioId || updateData.recipientId) {
        fields.push(`destinatario_id = $${paramCount++}`);
        values.push(updateData.destinatarioId || updateData.recipientId);
      }

      // Actualizar nombre del curso
      if (updateData.courseName || updateData.nombreCurso) {
        fields.push(`nombre_curso = $${paramCount++}`);
        values.push(updateData.courseName || updateData.nombreCurso);
      }

      // Actualizar institución
      if (updateData.institucion) {
        fields.push(`institucion = $${paramCount++}`);
        values.push(updateData.institucion);
      }

      // Actualizar fecha de expiración
      if (updateData.expirationDate !== undefined || updateData.fechaExpiracion !== undefined) {
        fields.push(`fecha_expiracion = $${paramCount++}`);
        values.push(updateData.expirationDate || updateData.fechaExpiracion);
      }

      // Actualizar estado
      if (updateData.status || updateData.estado) {
        fields.push(`estado = $${paramCount++}`);
        values.push(updateData.estado || updateData.status);
      }

      // Actualizar Google Drive ID
      if (updateData.googleDriveFileId || updateData.driveFileId) {
        fields.push(`drive_file_id = $${paramCount++}`);
        values.push(updateData.driveFileId || updateData.googleDriveFileId);
      }

      if (fields.length === 0) {
        return await this.getCertificateById(certificateId);
      }

      values.push(certificateId);

      const result = await pool.query<CertificateRow>(
        `UPDATE certificados SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCertificate(result.rows[0]);
    } catch (error) {
      const err = error as Error;
      console.error('Error actualizando certificado:', err.message);
      throw error;
    }
  }

  /**
   * Mapea un registro de PostgreSQL a formato de certificado
   */
  mapToCertificate(row: CertificateRow, assignedUsers: AssignedUser[] = []): Certificate {
    // Si no hay usuarios asignados pero hay destinatario_id en la fila, crear un array con uno
    let users = assignedUsers;
    if (users.length === 0 && row.destinatario_id) {
      users = [{
        id: row.destinatario_id,
        name: row.destinatario_user_nombre || '',
        email: row.destinatario_user_email || undefined,
        cedula: row.destinatario_cedula || undefined
      }];
    }
    
    // Si hay destinatario_user_nombre en la fila pero no en usuarios asignados, agregarlo
    if (users.length === 0 && row.destinatario_user_nombre) {
      users = [{
        id: row.destinatario_id || '',
        name: row.destinatario_user_nombre,
        email: row.destinatario_user_email || undefined,
        cedula: row.destinatario_cedula || undefined
      }];
    }

    // Usar el primer usuario como destinatario principal (para compatibilidad)
    const primaryRecipient = users.length > 0 ? users[0] : null;

    return {
      _id: String(row.id),
      id: row.id,
      certificateNumber: row.numero_certificado,
      numeroCertificado: row.numero_certificado,
      verificationCode: row.codigo_verificacion,
      codigoVerificacion: row.codigo_verificacion,
      courseName: row.nombre_curso,
      nombreCurso: row.nombre_curso,
      institucion: row.institucion,
      description: undefined,
      descripcion: undefined,
      // Destinatario principal (para compatibilidad)
      recipientId: primaryRecipient ? {
        _id: primaryRecipient.id,
        id: primaryRecipient.id,
        name: primaryRecipient.name,
        email: primaryRecipient.email
      } : null,
      destinatarioId: primaryRecipient ? primaryRecipient.id : row.destinatario_id,
      recipientName: primaryRecipient ? primaryRecipient.name : (row.destinatario_user_nombre || ''),
      destinatarioNombre: primaryRecipient ? primaryRecipient.name : (row.destinatario_user_nombre || ''),
      recipientEmail: primaryRecipient ? primaryRecipient.email : (row.destinatario_user_email || ''),
      destinatarioEmail: primaryRecipient ? primaryRecipient.email : (row.destinatario_user_email || ''),
      // Todos los usuarios asignados
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
        _id: row.emisor_id,
        id: row.emisor_id,
        name: row.emisor_nombre || '',
        email: row.emisor_email || ''
      },
      emisorId: row.emisor_id,
      issueDate: row.fecha_emision,
      fechaEmision: row.fecha_emision,
      expirationDate: row.fecha_expiracion,
      fechaExpiracion: row.fecha_expiracion,
      status: row.estado as 'draft' | 'issued' | 'revoked' | 'expired',
      estado: row.estado as 'draft' | 'issued' | 'revoked' | 'expired',
      googleDriveFileId: row.drive_file_id,
      driveFileId: row.drive_file_id,
      createdAt: row.creado_en,
      creadoEn: row.creado_en,
      // Campos calculados para compatibilidad
      isVerified: row.estado === 'issued'
    };
  }

  /**
   * Asigna un certificado a uno o más usuarios
   */
  async assignCertificateToUsers(certificateId: string | number, userIds: string[], assignedBy: string | null = null): Promise<unknown[]> {
    try {
      const assignments: unknown[] = [];
      
      for (const userId of userIds) {
        const result = await pool.query(
          `INSERT INTO certificados_usuarios (certificado_id, usuario_id, asignado_por)
           VALUES ($1, $2, $3)
           ON CONFLICT (certificado_id, usuario_id) DO NOTHING
           RETURNING *`,
          [certificateId, userId, assignedBy]
        );
        
        if (result.rows.length > 0) {
          assignments.push(result.rows[0]);
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
      const result = await pool.query(
        `DELETE FROM certificados_usuarios 
         WHERE certificado_id = $1 AND usuario_id = $2
         RETURNING *`,
        [certificateId, userId]
      );
      
      return result.rows.length > 0;
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
      // Asegurar que certificateId sea un número si es SERIAL
      const certId = typeof certificateId === 'string' && !isNaN(certificateId as any) 
        ? parseInt(certificateId) 
        : certificateId;
      
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM certificados_usuarios
         WHERE certificado_id = $1 AND usuario_id = $2`,
        [certId, userId]
      );
      
      const count = parseInt(result.rows[0].count);
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
      const result = await pool.query<{
        id: string;
        cedula: string;
        name: string;
        email: string | null;
        role: string;
        is_active: boolean;
        asignado_en: Date;
        asignado_por: string | null;
      }>(
        `SELECT u.*, cu.asignado_en, cu.asignado_por
         FROM certificados_usuarios cu
         INNER JOIN users u ON cu.usuario_id = u.id
         WHERE cu.certificado_id = $1
         ORDER BY cu.asignado_en DESC`,
        [certificateId]
      );
      
      return result.rows.map(row => ({
        _id: row.id,
        id: row.id,
        cedula: row.cedula,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        assignedAt: row.asignado_en,
        assignedBy: row.asignado_por
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
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || 'creado_en';
      const sortOrder = options.sortOrder || 'DESC';

      const sortByMap: Record<string, string> = {
        'createdAt': 'c.creado_en',
        'issueDate': 'c.fecha_emision',
        'courseName': 'c.nombre_curso'
      };
      const mappedSortBy = sortByMap[sortBy] || 'c.creado_en';

      const result = await pool.query<CertificateRow>(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         cu.asignado_en
         FROM certificados c
         INNER JOIN certificados_usuarios cu ON c.id = cu.certificado_id
         INNER JOIN users u1 ON c.emisor_id = u1.id
         WHERE cu.usuario_id = $1
         ORDER BY ${mappedSortBy} ${sortOrder}
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM certificados c
         INNER JOIN certificados_usuarios cu ON c.id = cu.certificado_id
         WHERE cu.usuario_id = $1`,
        [userId]
      );

      const total = parseInt(countResult.rows[0].count);

      return {
        certificates: result.rows.map(row => this.mapToCertificate(row)),
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
      let query = 'SELECT estado, COUNT(*) as count FROM certificados';
      const params: unknown[] = [];
      
      if (issuerId) {
        query += ' WHERE emisor_id = $1';
        params.push(issuerId);
      }
      
      query += ' GROUP BY estado';
      
      const result = await pool.query<{ estado: string; count: string }>(query, params);
      
      const stats: Record<string, number> = {};
      let total = 0;
      
      result.rows.forEach(row => {
        const count = parseInt(row.count);
        stats[row.estado] = count;
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
      const result = await pool.query(
        'DELETE FROM certificados WHERE id = $1 RETURNING *',
        [certificateId]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      const err = error as Error;
      console.error('Error eliminando certificado:', err.message);
      throw error;
    }
  }
}

export default new CertificatePostgresService();

