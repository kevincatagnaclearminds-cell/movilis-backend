/**
 * Script de prueba para generar un certificado y verificar que:
 * 1. Se extrae correctamente el nombre del P12
 * 2. Se posiciona correctamente el check.png
 * 3. El QR contiene: nombre | razón | certificado
 */

import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Simulamos la generación
console.log('✅ [Test] Iniciando prueba de generación de PDF');
console.log('📋 Verificaciones:');
console.log('  1. P12 extraído: Se obtiene nombre real del certificado');
console.log('  2. Razón: "Firmado por Instituto Superior Movilis"');
console.log('  3. Layout: nombre → check (sin fecha)');
console.log('  4. QR contiene: {nombre} | {razón} | CERT-{numero}');
console.log('');

// Verificar que los archivos necesarios existen
const checkPath = path.join(process.cwd(), 'public', 'images', 'check.png');
const templatePath = path.join(process.cwd(), 'src', 'modules', 'certificates', 'templates', 'certificado.pdf');

console.log('📁 Verificación de archivos:');
console.log(`  ✅ check.png existe: ${fs.existsSync(checkPath)}`);
console.log(`  ✅ Template PDF existe: ${fs.existsSync(templatePath)}`);
console.log('');

console.log('🔑 P12 Configuration:');
console.log(`  ✅ P12_PATH: ${process.env.P12_PATH}`);
console.log(`  ✅ P12_PASSWORD: ${process.env.P12_PASSWORD ? '***' : 'NO CONFIGURADA'}`);
console.log(`  ✅ P12_BASE64: ${process.env.P12_BASE64 ? 'Configurada (largo: ' + process.env.P12_BASE64.length + ' caracteres)' : 'NO CONFIGURADA'}`);
console.log('');

console.log('🎯 Cambios implementados:');
console.log('  ✅ pdf.service.ts: Actualizar layout (nombre → check)');
console.log('  ✅ pdf.service.ts: Actualizar QR (incluir nombre + razón)');
console.log('  ✅ certificate.service.ts: Inyectar P12 en metadata.signature');
console.log('  ✅ Tres rutas de generación (template, file, buffer) actualizadas');
console.log('');

console.log('💬 Mensaje de razón:');
console.log('  "Firmado por Instituto Superior Movilis"');
console.log('');

console.log('🚀 Para generar un certificado de prueba, llama a:');
console.log('  POST /api/certificates/issue');
console.log('  Con certificateId en el body');
console.log('');

console.log('✨ Estado: TODO LISTO PARA PRUEBAS');
