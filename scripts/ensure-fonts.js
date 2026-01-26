/**
 * Descarga Lora Bold Italic (y opcionalmente otras fuentes) a public/fonts/ si no existen.
 * Mismo estilo que el embed: <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,700&display=swap" rel="stylesheet">
 * font-weight: 700; font-style: italic;
 * Ejecutar: npm run ensure-fonts
 */
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');
const LORA_GSTATIC_LATIN_WOFF2 = 'https://fonts.gstatic.com/s/lora/v37/0QI8MX1D_JOuMw_hLdO6T2wV9KnW-C0Coq92nA.woff2';

const TTF_URLS = [
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lora/static/Lora-BoldItalic.ttf',
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lora/Lora-BoldItalic.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/lora/static/Lora-BoldItalic.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/lora/Lora-BoldItalic.ttf',
];

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function fetchOk(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error('archivo demasiado pequeño');
  return buf;
}

async function ensureFonts() {
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
    console.log('✅ Creado public/fonts/');
  }

  const ttfDest = path.join(FONTS_DIR, 'Lora-BoldItalic.ttf');
  const woff2Dest = path.join(FONTS_DIR, 'Lora-BoldItalic.woff2');

  if (fs.existsSync(ttfDest)) {
    console.log('⏭️  Lora-BoldItalic.ttf ya existe, se omite.');
    return;
  }

  for (const url of TTF_URLS) {
    try {
      const buf = await fetchOk(url);
      fs.writeFileSync(ttfDest, buf);
      console.log('✅ Descargado: Lora-BoldItalic.ttf');
      return;
    } catch (e) {
      console.warn(`   Fallo TTF ${url}: ${e.message}`);
    }
  }

  if (fs.existsSync(woff2Dest)) {
    console.log('⏭️  Lora-BoldItalic.woff2 ya existe, se omite.');
    return;
  }

  try {
    const buf = await fetchOk(LORA_GSTATIC_LATIN_WOFF2);
    fs.writeFileSync(woff2Dest, buf);
    console.log('✅ Descargado: Lora-BoldItalic.woff2 (mismo que fonts.googleapis.com/css2?family=Lora:ital,wght@1,700)');
  } catch (e) {
    console.warn(`   Fallo woff2 (gstatic): ${e.message}`);
    console.warn('⚠️  Añade Lora-BoldItalic.ttf manualmente desde https://fonts.google.com/specimen/Lora → Download family → static/');
  }
}

ensureFonts().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
