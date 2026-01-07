const fs = require('fs');
const path = require('path');

// Directorios a copiar
const assetsToCopy = [
  {
    src: 'src/modules/certificates/templates',
    dest: 'dist/modules/certificates/templates',
    pattern: /\.pdf$/
  }
];

console.log('📦 Copiando assets al directorio dist/...');

assetsToCopy.forEach(({ src, dest, pattern }) => {
  const srcPath = path.join(process.cwd(), src);
  const destPath = path.join(process.cwd(), dest);

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠️  Directorio fuente no encontrado: ${srcPath}`);
    return;
  }

  // Crear directorio destino si no existe
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
    console.log(`✅ Directorio creado: ${destPath}`);
  }

  // Copiar archivos que coincidan con el patrón
  try {
    const files = fs.readdirSync(srcPath);
    let copiedCount = 0;

    files.forEach(file => {
      if (pattern.test(file)) {
        const srcFile = path.join(srcPath, file);
        const destFile = path.join(destPath, file);
        fs.copyFileSync(srcFile, destFile);
        copiedCount++;
        console.log(`   ✓ ${file}`);
      }
    });

    if (copiedCount > 0) {
      console.log(`✅ Copiados ${copiedCount} archivo(s) de ${src} a ${dest}`);
    } else {
      console.warn(`⚠️  No se encontraron archivos para copiar en ${src}`);
    }
  } catch (error) {
    console.error(`❌ Error copiando archivos de ${src}:`, error.message);
  }
});

console.log('✅ Proceso de copia de assets completado');

