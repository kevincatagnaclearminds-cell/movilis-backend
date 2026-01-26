// @ts-nocheck
// NOTA: Este servicio requiere la tabla 'firmas' que no está en el schema de Prisma
// Si necesitas usar este servicio, agrega el modelo 'firmas' al schema.prisma
// Por ahora usa Prisma con queries raw
import prisma from '../../../config/prisma';
import { v4 as uuidv4 } from 'uuid';
import { encriptarDatos, desencriptarDatos } from '../utils/p12.utils';

interface CertificadoInfo {
  nombreCertificado: string;
  fechaExpiracion: string;
  fechaInicio: string;
  emisor: string;
  serialNumber: string;
  estaExpirado: boolean;
  estaVigente: boolean;
}

interface FirmaRow {
  id: string;
  usuario_cedula: string;
  nombre_certificado: string;
  fecha_subida: Date;
  fecha_expiracion: Date;
  estado: string;
  emisor: string;
  serial_number: string;
  archivo_encriptado: string;
  archivo_iv: string;
  password_encriptado: string;
  password_iv: string;
}

interface FirmaFormateada {
  id: string;
  usuarioCedula: string;
  nombreCertificado: string;
  fechaSubida: Date;
  fechaExpiracion: Date;
  estado: string;
  emisor: string;
  serialNumber: string;
}

interface EstadoFirma {
  tieneFirma: boolean;
  firma: FirmaFormateada | null;
}

/**
 * Servicio para gestionar firmas electrónicas
 */
class FirmaService {
  
  /**
   * Crear o actualizar firma electrónica de un usuario
   */
  async crearOActualizarFirma(
    usuarioCedula: string,
    certificadoInfo: CertificadoInfo,
    archivoBuffer: Buffer,
    password: string
  ): Promise<FirmaFormateada> {
    try {
      // Encriptar el archivo .p12
      const { encrypted: archivoEncriptado, iv: archivoIv } = encriptarDatos(archivoBuffer);
      
      // Encriptar la contraseña
      const { encrypted: passwordEncriptado, iv: passwordIv } = encriptarDatos(password);

      // Verificar si ya existe una firma para este usuario
      const firmaExistente = await this.obtenerFirmaPorCedula(usuarioCedula);

      let firma: FirmaRow;
      
      if (firmaExistente) {
        // Actualizar firma existente
        const result = await pool.query<FirmaRow>(
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
        const result = await pool.query<FirmaRow>(
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
      const err = error as Error;
      console.error('Error creando/actualizando firma:', err.message);
      throw error;
    }
  }

  /**
   * Obtener firma por cédula de usuario
   */
  async obtenerFirmaPorCedula(usuarioCedula: string): Promise<FirmaFormateada | null> {
    try {
      // Usar Prisma para rawQuery
      const resultado = await prisma.$queryRaw<FirmaRow[]>`
        SELECT * FROM firmas WHERE usuario_cedula = ${usuarioCedula}
      `;

      if (!resultado || resultado.length === 0) {
        return null;
      }

      return this.formatearFirma(resultado[0]);
    } catch (error) {
      const err = error as Error;
      console.warn('⚠️ Error obteniendo firma por cédula:', err.message);
      return null; // Retornar null en lugar de lanzar error
    }
  }

  /**
   * Verificar estado de firma (si está expirada)
   */
  async verificarEstadoFirma(usuarioCedula: string): Promise<EstadoFirma> {
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
      const err = error as Error;
      console.error('Error verificando estado de firma:', err.message);
      throw error;
    }
  }

  /**
   * Eliminar firma de un usuario
   */
  async eliminarFirma(usuarioCedula: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM firmas WHERE usuario_cedula = $1 RETURNING *',
        [usuarioCedula]
      );

      return result.rows.length > 0;
    } catch (error) {
      const err = error as Error;
      console.error('Error eliminando firma:', err.message);
      throw error;
    }
  }

  /**
   * Obtener archivo .p12 desencriptado (para firmar documentos)
   */
  async obtenerArchivoP12(usuarioCedula: string): Promise<{ buffer: Buffer; password: string } | null> {
    try {
      // Usar Prisma para hacer rawQuery
      const resultado = await prisma.$queryRaw<{
        archivo_encriptado: string;
        archivo_iv: string;
        password_encriptado: string;
        password_iv: string;
      }[]>`
        SELECT archivo_encriptado, archivo_iv, password_encriptado, password_iv 
        FROM firmas 
        WHERE usuario_cedula = ${usuarioCedula}
      `;

      if (!resultado || resultado.length === 0) {
        console.warn(`⚠️ [Firma] No se encontró P12 para cédula: ${usuarioCedula}`);
        return null;
      }

      const firma = resultado[0];
      
      const archivoBuffer = desencriptarDatos(firma.archivo_encriptado, firma.archivo_iv);
      const password = desencriptarDatos(firma.password_encriptado, firma.password_iv).toString();

      console.log(`✅ [Firma] P12 obtenido para cédula: ${usuarioCedula}`);
      return { buffer: archivoBuffer, password };
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error obteniendo archivo P12:', err.message);
      return null; // Retornar null en lugar de lanzar error
    }
  }

  /**
   * Formatear firma para respuesta API
   */
  formatearFirma(firma: FirmaRow): FirmaFormateada {
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

export default new FirmaService();


