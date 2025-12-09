/**
 * Utilidades para el módulo de certificados
 */

/**
 * Valida el formato de un número de certificado
 */
export function isValidCertificateNumber(certificateNumber: string): boolean {
  const pattern = /^CERT-[A-Z0-9]{8}$/;
  return pattern.test(certificateNumber);
}

/**
 * Genera un número de certificado único
 */
export function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

/**
 * Formatea una fecha para mostrar en el certificado
 */
export function formatCertificateDate(date: Date | string | null | undefined, locale: string = 'es-ES'): string {
  if (!date) return '';
  
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calcula la fecha de expiración basada en días
 */
export function calculateExpirationDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Verifica si una fecha está en el futuro
 */
export function isFutureDate(date: Date | string): boolean {
  return new Date(date) > new Date();
}

/**
 * Sanitiza el nombre del destinatario
 */
export function sanitizeRecipientName(name: string): string {
  return name.trim().replace(/[<>]/g, '');
}

/**
 * Valida el formato de email
 */
export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Obtiene el estado del certificado basado en fechas
 */
export function calculateCertificateStatus(certificate: {
  status?: string;
  expirationDate?: Date | string | null;
}): string {
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


