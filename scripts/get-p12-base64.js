const fs = require('fs');
const buffer = fs.readFileSync('secrets/mi_firma.p12');
const base64 = buffer.toString('base64');
fs.writeFileSync('p12_base64_only.txt', base64);
console.log('String base64 guardado en p12_base64_only.txt');
console.log('Longitud:', base64.length, 'caracteres');

