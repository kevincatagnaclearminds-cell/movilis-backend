const forge = require('node-forge');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../../../config/config');

/**
 * Utilidades para manejar archivos .p12/PKCS#12
 */

// Clave de encriptación del servidor (debe estar en variables de entorno)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || config.encryptionKey || 'default-encryption-key-32chars!!';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

/**
 * Parsear y validar un archivo .p12
 * @param {Buffer} archivoBuffer - Buffer del archivo .p12
 * @param {string} password - Contraseña del certificado
 * @returns {Object} - Información del certificado o error
 */
function parsearP12(archivoBuffer, password) {
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

    const info = {
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
    console.error('Error parseando .p12:', error.message);
    
    // Detectar error de contraseña incorrecta
    if (error.message.includes('Invalid password') || 
        error.message.includes('PKCS#12 MAC could not be verified') ||
        error.message.includes('Too few bytes to read')) {
      return { success: false, error: 'La contraseña del certificado es incorrecta' };
    }
    
    return { success: false, error: 'El archivo debe ser un certificado .p12 o .pfx válido' };
  }
}

/**
 * Extraer campo del subject o issuer del certificado
 * @param {Object} entity - Subject o Issuer del certificado
 * @param {Array} campos - Lista de campos a buscar en orden de prioridad
 * @returns {string|null}
 */
function extraerCampo(entity, campos) {
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
 * @param {Buffer|string} data - Datos a encriptar
 * @returns {Object} - { encrypted, iv }
 */
function encriptarDatos(data) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex')
  };
}

/**
 * Desencriptar datos usando AES-256-CBC
 * @param {string} encryptedHex - Datos encriptados en hex
 * @param {string} ivHex - IV en hex
 * @returns {Buffer} - Datos desencriptados
 */
function desencriptarDatos(encryptedHex, ivHex) {
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
 * @param {string} filename - Nombre del archivo
 * @returns {boolean}
 */
function validarExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.p12' || ext === '.pfx';
}

/**
 * Validar tamaño de archivo (máximo 5MB)
 * @param {number} size - Tamaño en bytes
 * @returns {boolean}
 */
function validarTamano(size) {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return size <= maxSize;
}

module.exports = {
  parsearP12,
  encriptarDatos,
  desencriptarDatos,
  validarExtension,
  validarTamano
};

