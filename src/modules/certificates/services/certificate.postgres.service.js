const { pool } = require('../../../config/postgres');
const { v4: uuidv4 } = require('uuid');

class CertificatePostgresService {
  /**
   * Crea un nuevo certificado
   */
  async createCertificate(certificateData) {
    try {
      const numeroCertificado = certificateData.numeroCertificado || `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const codigoVerificacion = certificateData.codigoVerificacion || uuidv4();

      const result = await pool.query(
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
          certificateData.destinatarioId || certificateData.recipientId,
          certificateData.emisorId || certificateData.issuerId,
          certificateData.fechaExpiracion || certificateData.expirationDate || null,
          certificateData.estado || certificateData.status || 'draft'
        ]
      );

      return this.mapToCertificate(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('El número de certificado o código de verificación ya existe');
      }
      throw error;
    }
  }

  /**
   * Obtiene un certificado por ID
   */
  async getCertificateById(certificateId) {
    try {
      const result = await pool.query(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         INNER JOIN users u2 ON c.destinatario_id = u2.id
         WHERE c.id = $1`,
        [certificateId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCertificate(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo certificado por ID:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene un certificado por número
   */
  async getCertificateByNumber(certificateNumber) {
    try {
      const result = await pool.query(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         INNER JOIN users u2 ON c.destinatario_id = u2.id
         WHERE c.numero_certificado = $1`,
        [certificateNumber]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCertificate(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo certificado por número:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene un certificado por código de verificación
   */
  async getCertificateByVerificationCode(verificationCode) {
    try {
      const result = await pool.query(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         INNER JOIN users u2 ON c.destinatario_id = u2.id
         WHERE c.codigo_verificacion = $1`,
        [verificationCode]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCertificate(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo certificado por código:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene todos los certificados con filtros (para admin)
   */
  async getAllCertificates(filters = {}, options = {}) {
    try {
      const page = parseInt(options.page || 1);
      const limit = parseInt(options.limit || 10);
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || 'creado_en';
      const sortOrder = options.sortOrder || 'DESC';

      // Mapear nombres de campos en inglés a español
      const sortByMap = {
        'createdAt': 'creado_en',
        'issueDate': 'fecha_emision',
        'courseName': 'nombre_curso',
        'recipientName': 'destinatario_user_nombre'
      };
      const mappedSortBy = sortByMap[sortBy] || sortBy;

      // Construir WHERE clause dinámicamente
      const whereConditions = [];
      const queryParams = [];
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
      const result = await pool.query(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         INNER JOIN users u2 ON c.destinatario_id = u2.id
         ${whereClause}
         ORDER BY c.${mappedSortBy} ${sortOrder}
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...queryParams, limit, offset]
      );

      // Query para contar total
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         INNER JOIN users u2 ON c.destinatario_id = u2.id
         ${whereClause}`,
        queryParams
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
      console.error('Error obteniendo todos los certificados:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene certificados por destinatario (email)
   */
  async getCertificatesByRecipient(recipientEmail, options = {}) {
    try {
      const page = parseInt(options.page || 1);
      const limit = parseInt(options.limit || 10);
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || 'creado_en';
      const sortOrder = options.sortOrder || 'DESC';

      // Mapear nombres de campos en inglés a español
      const sortByMap = {
        'createdAt': 'creado_en',
        'issueDate': 'fecha_emision',
        'courseName': 'nombre_curso',
        'recipientName': 'destinatario_nombre'
      };
      const mappedSortBy = sortByMap[sortBy] || sortBy;

      // Buscar por email del usuario en la tabla users
      const result = await pool.query(
        `SELECT c.*, 
         u1.name as emisor_nombre, u1.email as emisor_email,
         u2.name as destinatario_user_nombre, u2.email as destinatario_user_email
         FROM certificados c
         INNER JOIN users u1 ON c.emisor_id = u1.id
         INNER JOIN users u2 ON c.destinatario_id = u2.id
         WHERE u2.email = $1
         ORDER BY c.${mappedSortBy} ${sortOrder}
         LIMIT $2 OFFSET $3`,
        [recipientEmail, limit, offset]
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM certificados c
         INNER JOIN users u ON c.destinatario_id = u.id
         WHERE u.email = $1`,
        [recipientEmail]
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
      console.error('Error obteniendo certificados por destinatario:', error.message);
      throw error;
    }
  }

  /**
   * Actualiza un certificado
   */
  async updateCertificate(certificateId, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.status || updateData.estado) {
        fields.push(`estado = $${paramCount++}`);
        values.push(updateData.estado || updateData.status);
      }
      if (updateData.googleDriveFileId || updateData.driveFileId) {
        fields.push(`drive_file_id = $${paramCount++}`);
        values.push(updateData.driveFileId || updateData.googleDriveFileId);
      }

      if (fields.length === 0) {
        return await this.getCertificateById(certificateId);
      }

      values.push(certificateId);

      const result = await pool.query(
        `UPDATE certificados SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToCertificate(result.rows[0]);
    } catch (error) {
      console.error('Error actualizando certificado:', error.message);
      throw error;
    }
  }

  /**
   * Mapea un registro de PostgreSQL a formato de certificado
   */
  mapToCertificate(row) {
    return {
      _id: row.id,
      id: row.id,
      certificateNumber: row.numero_certificado,
      numeroCertificado: row.numero_certificado,
      verificationCode: row.codigo_verificacion,
      codigoVerificacion: row.codigo_verificacion,
      courseName: row.nombre_curso,
      nombreCurso: row.nombre_curso,
      institucion: row.institucion,
      horasDuracion: row.horas_duracion,
      description: row.descripcion,
      descripcion: row.descripcion,
      recipientId: {
        _id: row.destinatario_id,
        id: row.destinatario_id,
        name: row.destinatario_user_nombre,
        email: row.destinatario_user_email
      },
      destinatarioId: row.destinatario_id,
      // Datos del destinatario obtenidos desde users mediante JOIN
      recipientName: row.destinatario_user_nombre,
      destinatarioNombre: row.destinatario_user_nombre,
      recipientEmail: row.destinatario_user_email,
      destinatarioEmail: row.destinatario_user_email,
      issuerId: {
        _id: row.emisor_id,
        id: row.emisor_id,
        name: row.emisor_nombre,
        email: row.emisor_email
      },
      emisorId: row.emisor_id,
      issueDate: row.fecha_emision,
      fechaEmision: row.fecha_emision,
      expirationDate: row.fecha_expiracion,
      fechaExpiracion: row.fecha_expiracion,
      status: row.estado,
      estado: row.estado,
      googleDriveFileId: row.drive_file_id,
      driveFileId: row.drive_file_id,
      createdAt: row.creado_en,
      creadoEn: row.creado_en,
      // actualizado_en eliminado - los certificados no se actualizan después de emitirse
      // Campos calculados para compatibilidad
      isVerified: row.estado === 'issued'
    };
  }
}

module.exports = new CertificatePostgresService();
