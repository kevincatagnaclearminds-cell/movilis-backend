/**
 * Utilidades para el módulo de certificados
 */

/**
 * Valida el formato de un número de certificado
 * @param {string} certificateNumber - Número de certificado
 * @returns {boolean} - True si es válido
 */
function isValidCertificateNumber(certificateNumber) {
  const pattern = /^CERT-[A-Z0-9]{8}$/;
  return pattern.test(certificateNumber);
}

/**
 * Genera un número de certificado único
 * @returns {string} - Número de certificado generado
 */
function generateCertificateNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

/**
 * Formatea una fecha para mostrar en el certificado
 * @param {Date} date - Fecha a formatear
 * @param {string} locale - Locale (default: 'es-ES')
 * @returns {string} - Fecha formateada
 */
function formatCertificateDate(date, locale = 'es-ES') {
  if (!date) return '';
  
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calcula la fecha de expiración basada en días
 * @param {number} days - Número de días desde hoy
 * @returns {Date} - Fecha de expiración
 */
function calculateExpirationDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Verifica si una fecha está en el futuro
 * @param {Date} date - Fecha a verificar
 * @returns {boolean} - True si es futura
 */
function isFutureDate(date) {
  return new Date(date) > new Date();
}

/**
 * Sanitiza el nombre del destinatario
 * @param {string} name - Nombre a sanitizar
 * @returns {string} - Nombre sanitizado
 */
function sanitizeRecipientName(name) {
  return name.trim().replace(/[<>]/g, '');
}

/**
 * Valida el formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si es válido
 */
function isValidEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Obtiene el estado del certificado basado en fechas
 * @param {Object} certificate - Certificado
 * @returns {string} - Estado calculado
 */
function calculateCertificateStatus(certificate) {
  if (certificate.status === 'revoked') {
    return 'revoked';
  }

  if (certificate.expirationDate && new Date() > new Date(certificate.expirationDate)) {
    return 'expired';
  }

  if (certificate.status === 'issued') {
    return 'issued';
  }

  return certificate.status || 'draft';
}

module.exports = {
  isValidCertificateNumber,
  generateCertificateNumber,
  formatCertificateDate,
  calculateExpirationDate,
  isFutureDate,
  sanitizeRecipientName,
  isValidEmail,
  calculateCertificateStatus
};

