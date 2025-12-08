const { pool } = require('../../../config/postgres');
const { v4: uuidv4 } = require('uuid');
const { encriptarDatos, desencriptarDatos, parsearP12 } = require('../utils/p12.utils');

/**
 * Servicio para gestionar firmas electrónicas
 */
class FirmaService {
  
  /**
   * Crear o actualizar firma electrónica de un usuario
   * @param {string} usuarioCedula - Cédula del usuario
   * @param {Object} certificadoInfo - Información del certificado
   * @param {Buffer} archivoBuffer - Buffer del archivo .p12
   * @param {string} password - Contraseña del certificado
   * @returns {Object} - Firma creada/actualizada
   */
  async crearOActualizarFirma(usuarioCedula, certificadoInfo, archivoBuffer, password) {
    try {
      // Encriptar el archivo .p12
      const { encrypted: archivoEncriptado, iv: archivoIv } = encriptarDatos(archivoBuffer);
      
      // Encriptar la contraseña (opcional, para firmar sin pedir contraseña cada vez)
      const { encrypted: passwordEncriptado, iv: passwordIv } = encriptarDatos(password);

      // Verificar si ya existe una firma para este usuario
      const firmaExistente = await this.obtenerFirmaPorCedula(usuarioCedula);

      let firma;
      
      if (firmaExistente) {
        // Actualizar firma existente
        const result = await pool.query(
          `UPDATE firmas SET 
            nombre_certificado = $1,
            fecha_expiracion = $2,
            emisor = $3,
            serial_number = $4,
            estado = $5,
            archivo_encriptado = $6,
            archivo_iv = $7,
            password_encriptado = $8,
            password_iv = $9,
            fecha_subida = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE usuario_cedula = $10
          RETURNING *`,
          [
            certificadoInfo.nombreCertificado,
            certificadoInfo.fechaExpiracion,
            certificadoInfo.emisor,
            certificadoInfo.serialNumber,
            certificadoInfo.estaExpirado ? 'expirada' : 'configurada',
            archivoEncriptado,
            archivoIv,
            passwordEncriptado,
            passwordIv,
            usuarioCedula
          ]
        );
        firma = result.rows[0];
      } else {
        // Crear nueva firma
        const id = uuidv4();
        const result = await pool.query(
          `INSERT INTO firmas (
            id, usuario_cedula, nombre_certificado, fecha_expiracion,
            emisor, serial_number, estado, archivo_encriptado, archivo_iv,
            password_encriptado, password_iv
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            id,
            usuarioCedula,
            certificadoInfo.nombreCertificado,
            certificadoInfo.fechaExpiracion,
            certificadoInfo.emisor,
            certificadoInfo.serialNumber,
            certificadoInfo.estaExpirado ? 'expirada' : 'configurada',
            archivoEncriptado,
            archivoIv,
            passwordEncriptado,
            passwordIv
          ]
        );
        firma = result.rows[0];
      }

      return this.formatearFirma(firma);
    } catch (error) {
      console.error('Error creando/actualizando firma:', error.message);
      throw error;
    }
  }

  /**
   * Obtener firma por cédula de usuario
   * @param {string} usuarioCedula - Cédula del usuario
   * @returns {Object|null} - Firma encontrada o null
   */
  async obtenerFirmaPorCedula(usuarioCedula) {
    try {
      const result = await pool.query(
        'SELECT * FROM firmas WHERE usuario_cedula = $1',
        [usuarioCedula]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatearFirma(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo firma:', error.message);
      throw error;
    }
  }

  /**
   * Verificar estado de firma (si está expirada)
   * @param {string} usuarioCedula - Cédula del usuario
   * @returns {Object} - Estado de la firma
   */
  async verificarEstadoFirma(usuarioCedula) {
    try {
      const firma = await this.obtenerFirmaPorCedula(usuarioCedula);

      if (!firma) {
        return {
          tieneFirma: false,
          firma: null
        };
      }

      // Verificar si la firma ha expirado
      const fechaExpiracion = new Date(firma.fechaExpiracion);
      const ahora = new Date();
      
      if (fechaExpiracion < ahora && firma.estado !== 'expirada') {
        // Actualizar estado a expirada
        await pool.query(
          'UPDATE firmas SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE usuario_cedula = $2',
          ['expirada', usuarioCedula]
        );
        firma.estado = 'expirada';
      }

      return {
        tieneFirma: true,
        firma
      };
    } catch (error) {
      console.error('Error verificando estado de firma:', error.message);
      throw error;
    }
  }

  /**
   * Eliminar firma de un usuario
   * @param {string} usuarioCedula - Cédula del usuario
   * @returns {boolean} - true si se eliminó, false si no existía
   */
  async eliminarFirma(usuarioCedula) {
    try {
      const result = await pool.query(
        'DELETE FROM firmas WHERE usuario_cedula = $1 RETURNING *',
        [usuarioCedula]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error eliminando firma:', error.message);
      throw error;
    }
  }

  /**
   * Obtener archivo .p12 desencriptado (para firmar documentos)
   * @param {string} usuarioCedula - Cédula del usuario
   * @returns {Object} - { buffer, password }
   */
  async obtenerArchivoP12(usuarioCedula) {
    try {
      const result = await pool.query(
        'SELECT archivo_encriptado, archivo_iv, password_encriptado, password_iv FROM firmas WHERE usuario_cedula = $1',
        [usuarioCedula]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const firma = result.rows[0];
      
      const archivoBuffer = desencriptarDatos(firma.archivo_encriptado, firma.archivo_iv);
      const password = desencriptarDatos(firma.password_encriptado, firma.password_iv).toString();

      return { buffer: archivoBuffer, password };
    } catch (error) {
      console.error('Error obteniendo archivo P12:', error.message);
      throw error;
    }
  }

  /**
   * Formatear firma para respuesta API
   * @param {Object} firma - Firma de la base de datos
   * @returns {Object} - Firma formateada
   */
  formatearFirma(firma) {
    return {
      id: firma.id,
      usuarioCedula: firma.usuario_cedula,
      nombreCertificado: firma.nombre_certificado,
      fechaSubida: firma.fecha_subida,
      fechaExpiracion: firma.fecha_expiracion,
      estado: firma.estado,
      emisor: firma.emisor,
      serialNumber: firma.serial_number
    };
  }
}

module.exports = new FirmaService();

