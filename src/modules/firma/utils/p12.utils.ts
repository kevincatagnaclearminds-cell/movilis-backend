import forge from 'node-forge';
import crypto from 'crypto';
import path from 'path';
import config from '../../../config/config';

/**
 * Utilidades para manejar archivos .p12/PKCS#12
 */

// Clave de encriptación del servidor (debe estar en variables de entorno)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (config as any).encryptionKey || 'default-encryption-key-32chars!!';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

interface CertificadoInfo {
  nombreCertificado: string;
  emisor: string;
  fechaExpiracion: string;
  fechaInicio: string;
  serialNumber: string;
  estaExpirado: boolean;
  estaVigente: boolean;
}

interface ParseResult {
  success: boolean;
  error?: string;
  info?: CertificadoInfo;
}

interface EncryptionResult {
  encrypted: string;
  iv: string;
}

/**
 * Parsear y validar un archivo .p12
 */
export function parsearP12(archivoBuffer: Buffer, password: string): ParseResult {
  try {
    // Convertir buffer a formato forge
    const p12Der = forge.util.createBuffer(archivoBuffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extraer certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];

    if (!certBag || certBag.length === 0) {
      return { success: false, error: 'No se encontró certificado en el archivo' };
    }

    const cert = certBag[0].cert;

    if (!cert) {
      return { success: false, error: 'No se pudo extraer el certificado' };
    }

    // Extraer información del certificado
    const nombreCertificado = extraerCampo(cert.subject, ['CN', 'O', 'OU']) || 'Sin nombre';
    const emisor = extraerCampo(cert.issuer, ['CN', 'O']) || 'Emisor desconocido';
    const fechaExpiracion = cert.validity.notAfter;
    const fechaInicio = cert.validity.notBefore;
    const serialNumber = cert.serialNumber;

    // Verificar si el certificado está expirado
    const ahora = new Date();
    const estaExpirado = fechaExpiracion < ahora;
    const estaVigente = fechaInicio <= ahora && fechaExpiracion >= ahora;

    const info: CertificadoInfo = {
      nombreCertificado,
      emisor,
      fechaExpiracion: fechaExpiracion.toISOString(),
      fechaInicio: fechaInicio.toISOString(),
      serialNumber,
      estaExpirado,
      estaVigente
    };

    return { success: true, info };
  } catch (error) {
    const err = error as Error;
    console.error('Error parseando .p12:', err.message);
    
    // Detectar error de contraseña incorrecta
    if (err.message.includes('Invalid password') || 
        err.message.includes('PKCS#12 MAC could not be verified') ||
        err.message.includes('Too few bytes to read')) {
      return { success: false, error: 'La contraseña del certificado es incorrecta' };
    }
    
    return { success: false, error: 'El archivo debe ser un certificado .p12 o .pfx válido' };
  }
}

/**
 * Extraer campo del subject o issuer del certificado
 */
function extraerCampo(entity: any, campos: string[]): string | null {
  for (const campo of campos) {
    const field = entity.getField(campo);
    if (field && field.value) {
      return field.value;
    }
  }
  return null;
}

/**
 * Encriptar datos usando AES-256-CBC
 */
export function encriptarDatos(data: Buffer | string): EncryptionResult {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
  let encrypted = cipher.update(dataBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex')
  };
}

/**
 * Desencriptar datos usando AES-256-CBC
 */
export function desencriptarDatos(encryptedHex: string, ivHex: string): Buffer {
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
}

/**
 * Validar extensión de archivo
 */
export function validarExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.p12' || ext === '.pfx';
}

/**
 * Validar tamaño de archivo (máximo 5MB)
 */
export function validarTamano(size: number): boolean {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return size <= maxSize;
}


