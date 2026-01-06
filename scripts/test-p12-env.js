/**
 * Script para probar que el certificado P12 se puede leer correctamente desde las variables de entorno
 */

require('dotenv/config');
const fs = require('fs');

console.log('🔍 Verificando configuración de P12 desde variables de entorno...\n');

// Verificar P12_BASE64
const p12Base64 = process.env.P12_BASE64;
const p12Password = process.env.P12_PASSWORD;

if (!p12Base64) {
  console.error('❌ P12_BASE64 no está definido en las variables de entorno');
  process.exit(1);
}

if (!p12Password) {
  console.error('❌ P12_PASSWORD no está definido en las variables de entorno');
  process.exit(1);
}

console.log('✅ P12_BASE64 encontrado');
console.log(`   Longitud: ${p12Base64.length} caracteres`);

// Limpiar el base64
const cleanBase64 = p12Base64.replace(/\s/g, '').trim();
console.log(`   Longitud después de limpiar: ${cleanBase64.length} caracteres`);

if (cleanBase64.length < 100) {
  console.error('❌ P12_BASE64 parece estar vacío o incompleto');
  process.exit(1);
}

// Decodificar
try {
  const buffer = Buffer.from(cleanBase64, 'base64');
  console.log(`✅ Base64 decodificado correctamente`);
  console.log(`   Tamaño del buffer: ${buffer.length} bytes`);
  
  if (buffer.length < 1024) {
    console.warn('⚠️ El buffer es muy pequeño. Un certificado P12 válido debe tener al menos 1KB');
  }
  
  // Intentar crear el signer
  console.log('\n🔏 Intentando crear P12Signer...');
  const { P12Signer } = require('@signpdf/signer-p12');
  
  try {
    const signer = new P12Signer(buffer, {
      passphrase: p12Password
    });
    console.log('✅ P12Signer creado correctamente');
    console.log('✅ El certificado P12 es válido y la contraseña es correcta');
  } catch (signerError) {
    console.error('❌ Error creando P12Signer:', signerError.message);
    console.error('\nPosibles causas:');
    console.error('  1. La contraseña (P12_PASSWORD) es incorrecta');
    console.error('  2. El certificado P12 está corrupto');
    console.error('  3. El base64 está incompleto o mal formateado');
    process.exit(1);
  }
  
} catch (decodeError) {
  console.error('❌ Error decodificando base64:', decodeError.message);
  console.error('   Verifique que P12_BASE64 sea un base64 válido');
  process.exit(1);
}

console.log('\n✅ Todo está correcto. El certificado P12 se puede usar para firmar PDFs.');

