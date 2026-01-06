/**
 * Script para convertir archivo P12 a base64
 * Uso: node scripts/convert-p12-to-base64.js ruta/al/archivo.p12
 */

const fs = require('fs');
const path = require('path');

// Obtener ruta del archivo desde argumentos
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Error: Debes proporcionar la ruta al archivo .p12');
  console.log('\n📝 Uso:');
  console.log('   node scripts/convert-p12-to-base64.js ruta/al/certificado.p12');
  console.log('\n📝 Ejemplo:');
  console.log('   node scripts/convert-p12-to-base64.js secrets/certificado.p12');
  process.exit(1);
}

// Verificar que el archivo existe
if (!fs.existsSync(filePath)) {
  console.error(`❌ Error: El archivo no existe: ${filePath}`);
  process.exit(1);
}

try {
  // Leer el archivo
  const fileBuffer = fs.readFileSync(filePath);
  
  // Convertir a base64
  const base64String = fileBuffer.toString('base64');
  
  console.log('\n✅ Archivo convertido a base64 exitosamente!\n');
  console.log('📋 Copia este valor y pégalo en tu archivo .env como P12_BASE64:\n');
  console.log('─'.repeat(80));
  console.log(base64String);
  console.log('─'.repeat(80));
  console.log('\n💡 También puedes guardarlo directamente en tu .env así:');
  console.log(`   P12_BASE64="${base64String}"`);
  console.log('\n⚠️  IMPORTANTE: Mantén este valor seguro y no lo compartas públicamente!\n');
  
} catch (error) {
  console.error('❌ Error al convertir el archivo:', error.message);
  process.exit(1);
}

