import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import * as dotenv from 'dotenv';
import userService from '../../users/services/user.prisma.service';

// Cargar variables de entorno (.env) para obtener P12_PATH y P12_PASSWORD
dotenv.config();

/**
 * Lora Bold Italic = mismo estilo que el embed de Google Fonts:
 *   <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,700&display=swap" rel="stylesheet">
 *   font-family: "Lora", serif; font-weight: 700; font-style: italic;
 */
const LORA_GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,700&display=swap';
const LORA_GSTATIC_LATIN_WOFF2 = 'https://fonts.gstatic.com/s/lora/v37/0QI8MX1D_JOuMw_hLdO6T2wV9KnW-C0Coq92nA.woff2';

/** URLs de fuentes: TTF (google/fonts) y, para Lora, woff2 (fonts.gstatic, mismo que el CSS de arriba) */
const FONT_URLS: Record<string, string> = {
  'Lora-BoldItalic': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lora/static/Lora-BoldItalic.ttf',
  'StoryScript-Regular': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/storyscript/StoryScript-Regular.ttf',
  'DancingScript-Regular': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/dancingscript/DancingScript-Regular.ttf',
  'GreatVibes-Regular': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/greatvibes/GreatVibes-Regular.ttf',
};

interface CertificateData {
  certificateNumber: string;
  recipientName: string;
  courseName: string;
  courseDescription?: string;
  issueDate: Date | string;
  expirationDate?: Date | string | null;
  issuerName?: string;
  metadata?: Record<string, unknown>;
  fontName?: string;
}

class PDFService {
  private certificatesDir: string;
  private templatePath: string = '';
  private templateIsImage: boolean = false; // true si es JPG/PNG, false si es PDF
  private fontsDir: string;
  private fonts: Record<string, string>;
  private defaultFont: string;

  constructor() {
    // En Vercel (serverless), no crear directorios locales - usar /tmp si es necesario
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isServerless) {
      // En serverless, usar /tmp para archivos temporales
      this.certificatesDir = '/tmp/uploads/certificates';
      this.fontsDir = '/tmp/public/fonts';
    } else {
      // En desarrollo local, usar directorios normales
      this.certificatesDir = path.join(__dirname, '../../../uploads/certificates');
      // Usar process.cwd() para obtener la raíz del proyecto (fuera de src/)
      this.fontsDir = path.join(process.cwd(), 'public', 'fonts');
    }
    
    // Crear directorios solo si no estamos en serverless o si es /tmp
    if (!isServerless || this.certificatesDir.startsWith('/tmp')) {
      try {
        if (!fs.existsSync(this.certificatesDir)) {
          fs.mkdirSync(this.certificatesDir, { recursive: true });
        }
        if (!fs.existsSync(this.fontsDir)) {
          fs.mkdirSync(this.fontsDir, { recursive: true });
        }
      } catch (error) {
        // En serverless, los directorios pueden no ser necesarios
        console.warn('⚠️ No se pudieron crear directorios (normal en serverless):', (error as Error).message);
      }
    }
    
    // Ruta a la plantilla - buscar PDF o JPG en múltiples ubicaciones
    // 1. En dist/ (producción compilada)
    // 2. En src/ (desarrollo)
    const basePaths = [
      path.join(__dirname, '../templates'), // dist/modules/certificates/templates/
      path.join(__dirname, '../../../../src/modules/certificates/templates'), // desde dist/ hacia src/
      path.join(process.cwd(), 'src/modules/certificates/templates'), // desde raíz del proyecto
      path.join(process.cwd(), 'dist/modules/certificates/templates') // desde raíz compilado
    ];
    
    // Buscar primero imágenes (JPG/JPEG), luego PDF
    let foundTemplate = false;
    for (const basePath of basePaths) {
      // Intentar JPEG primero
      const jpegPath = path.join(basePath, 'certificado.jpeg');
      if (fs.existsSync(jpegPath)) {
        this.templatePath = jpegPath;
        this.templateIsImage = true;
        foundTemplate = true;
        console.log(`✅ [PDF] Plantilla JPEG encontrada en: ${jpegPath}`);
        break;
      }
      
      // Intentar JPG
      const jpgPath = path.join(basePath, 'certificado.jpg');
      if (fs.existsSync(jpgPath)) {
        this.templatePath = jpgPath;
        this.templateIsImage = true;
        foundTemplate = true;
        console.log(`✅ [PDF] Plantilla JPG encontrada en: ${jpgPath}`);
        break;
      }
      
      // Intentar PDF
      const pdfPath = path.join(basePath, 'certificado.pdf');
      if (fs.existsSync(pdfPath)) {
        this.templatePath = pdfPath;
        this.templateIsImage = false;
        foundTemplate = true;
        console.log(`✅ [PDF] Plantilla PDF encontrada en: ${pdfPath}`);
        break;
      }
    }
    
    if (!foundTemplate) {
      // Usar la primera ruta como fallback (se verificará en generateCertificateFromTemplate)
      this.templatePath = path.join(basePaths[0], 'certificado.pdf');
      this.templateIsImage = false;
      console.warn(`⚠️ [PDF] Plantilla no encontrada en ninguna ubicación. Se usará generación sin plantilla.`);
      console.warn(`   Rutas buscadas: ${basePaths.map(bp => path.join(bp, 'certificado.{jpg,pdf}')).join(', ')}`);
    }
    
    // Rutas a las fuentes disponibles (para el nombre del certificado)
    // Lora Bold Italic = family=Lora:ital,wght@1,700 (font-weight 700, font-style italic), como el embed de Google Fonts
    this.fonts = {
      loraBoldItalic: path.join(this.fontsDir, 'Lora-BoldItalic.ttf'),
      loraBoldItalicWoff2: path.join(this.fontsDir, 'Lora-BoldItalic.woff2'),
      storyScript: path.join(this.fontsDir, 'StoryScript-Regular.ttf'),
      dancingScript: path.join(this.fontsDir, 'DancingScript-Regular.ttf'),
      greatVibes: path.join(this.fontsDir, 'GreatVibes-Regular.ttf'),
      alexBrush: path.join(this.fontsDir, 'AlexBrush-Regular.ttf'),
    };
    
    // Fuente por defecto para el nombre (Lora Bold Italic - font-weight 700, italic)
    this.defaultFont = 'loraBoldItalic';
  }

  /**
   * Descarga las fuentes desde URLs (estilo Google Fonts) si no existen en public/fonts.
   * Así no hace falta descargar ni copiar los TTF a mano.
   */
  private async ensureFonts(): Promise<void> {
    const toFetch: { key: string; dest: string; urls: string[] }[] = [
      {
        key: 'Lora-BoldItalic',
        dest: path.join(this.fontsDir, 'Lora-BoldItalic.ttf'),
        urls: [
          FONT_URLS['Lora-BoldItalic'],
          'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lora/Lora-BoldItalic.ttf',
        ].filter(Boolean) as string[],
      },
      { key: 'StoryScript-Regular', dest: path.join(this.fontsDir, 'StoryScript-Regular.ttf'), urls: [FONT_URLS['StoryScript-Regular']].filter(Boolean) as string[] },
      { key: 'DancingScript-Regular', dest: path.join(this.fontsDir, 'DancingScript-Regular.ttf'), urls: [FONT_URLS['DancingScript-Regular']].filter(Boolean) as string[] },
      { key: 'GreatVibes-Regular', dest: path.join(this.fontsDir, 'GreatVibes-Regular.ttf'), urls: [FONT_URLS['GreatVibes-Regular']].filter(Boolean) as string[] },
    ];
    for (const { key, dest, urls } of toFetch) {
      if (fs.existsSync(dest)) continue;
      let done = false;
      for (const url of urls) {
        if (!url) continue;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 1000) throw new Error('Respuesta demasiado pequeña');
          fs.writeFileSync(dest, buf);
          console.log(`✅ [PDF] Fuente descargada (estilo Google Fonts): ${key}`);
          done = true;
          break;
        } catch (e) {
          if (url === urls[urls.length - 1]) {
            console.warn(`⚠️ [PDF] No se pudo descargar ${key}:`, (e as Error).message);
          }
        }
      }
      if (done) continue;
      if (key === 'Lora-BoldItalic') {
        const woff2Dest = path.join(this.fontsDir, 'Lora-BoldItalic.woff2');
        if (fs.existsSync(woff2Dest)) continue;
        try {
          const res = await fetch(LORA_GSTATIC_LATIN_WOFF2);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 1000) throw new Error('Respuesta demasiado pequeña');
          fs.writeFileSync(woff2Dest, buf);
          console.log(`✅ [PDF] Lora Bold Italic descargada (woff2, mismo que ${LORA_GOOGLE_FONTS_CSS})`);
        } catch (e) {
          console.warn(`⚠️ [PDF] No se pudo descargar Lora (woff2):`, (e as Error).message);
        }
      }
    }
  }

  /**
   * Genera un certificado en PDF usando la plantilla base
   */
  async generateCertificateFromTemplate(certificateData: CertificateData, recipientCedula: string | null = null): Promise<Buffer> {
    try {
      // Descargar fuentes desde URLs (estilo Google Fonts) si no existen
      await this.ensureFonts();

      // Obtener el nombre del usuario desde PostgreSQL si se proporciona la cédula
      let recipientName = certificateData.recipientName;
      
      if (recipientCedula) {
        try {
          const user = await userService.getUserByCedula(recipientCedula);
          if (user && user.name) {
            recipientName = user.name;
          }
        } catch (error) {
          const err = error as Error;
          console.warn('No se pudo obtener el usuario de la BD, usando nombre del certificado:', err.message);
        }
      }

      // Verificar si existe la plantilla
      if (!fs.existsSync(this.templatePath)) {
        console.warn(`⚠️ [PDF] Plantilla no encontrada en: ${this.templatePath}`);
        console.warn('   Usando generación sin plantilla (método alternativo)');
        return await this.generateCertificateBuffer(certificateData);
      }

      console.log(`📄 [PDF] Cargando plantilla desde: ${this.templatePath}`);
      
      let pdfDoc: PDFLibDocument;
      
      if (this.templateIsImage) {
        // Si es una imagen (JPG/JPEG), convertirla a PDF primero
        const fileExt = path.extname(this.templatePath).toLowerCase();
        console.log(`🖼️ [PDF] Detectada plantilla de imagen (${fileExt}), convirtiendo a PDF...`);
        const templateBytes = fs.readFileSync(this.templatePath);
        console.log(`✅ [PDF] Imagen cargada (${templateBytes.length} bytes)`);
        
        // Crear un nuevo PDF y embebber la imagen
        pdfDoc = await PDFLibDocument.create();
        let image;
        
        // Intentar cargar como JPG (funciona para .jpg y .jpeg)
        try {
          image = await pdfDoc.embedJpg(templateBytes);
        } catch (jpgError) {
          // Si falla JPG, intentar PNG
          console.log(`⚠️ [PDF] No se pudo cargar como JPG, intentando PNG...`);
          try {
            image = await pdfDoc.embedPng(templateBytes);
          } catch (pngError) {
            throw new Error(`No se pudo cargar la imagen. Formatos soportados: JPG, JPEG, PNG. Error: ${(pngError as Error).message}`);
          }
        }
        
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
        console.log(`✅ [PDF] Imagen convertida a PDF (${image.width}x${image.height}px)`);
      } else {
        // Si es PDF, cargarlo directamente
        const templateBytes = fs.readFileSync(this.templatePath);
        console.log(`✅ [PDF] Plantilla PDF cargada (${templateBytes.length} bytes)`);
        pdfDoc = await PDFLibDocument.load(templateBytes);
      }
      
      // Obtener la primera página
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        throw new Error('La plantilla PDF no contiene páginas');
      }
      const page = pages[0];
      const { width } = page.getSize();
      
      // Usar Helvetica Bold (sans-serif, bold) para el nombre del certificado
      // Estilo: bold, uppercase, negro (como en la imagen de referencia)
      let font: PDFFont;
      try {
        font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        console.log('✅ [PDF] Usando Helvetica Bold para el nombre del certificado');
      } catch (error) {
        const err = error as Error;
        console.error('❌ [PDF] Error cargando Helvetica Bold:', err.message);
        console.warn('   Usando Helvetica como fallback');
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
      
      // ============================================
      // CONFIGURACIÓN DE POSICIONES - AJUSTA AQUÍ
      // ============================================
      
      // Posición del NOMBRE DEL USUARIO
      const nombreY = 1840;  // Posición vertical: aumenta para SUBIR, disminuye para BAJAR (1850 = arriba, 1000 = abajo)
      const fontSize = 80;  // Tamaño base de la fuente del nombre (130 = grande, 60-90 = más pequeño)
      const scaleY = 1.5;  // Escala vertical (altura): aumenta para hacer el texto más alto (1.0 = normal, 1.2-1.5 = moderado, 2.0 = muy alto)
      
      // Posición y tamaño de la FIRMA (QR + nombre del firmante)
      const stampY = 630;  // Posición vertical del QR: aumenta para subir, disminuye para bajar
      const stampXOffset = 1250;  // Offset horizontal del QR desde la derecha: aumenta para mover más a la izquierda
      const qrScale = 0.60;  // Tamaño del QR (0.15 = más pequeño, 0.25–0.35 = más grande)
      const textStartXOffset = 310;  // Distancia del nombre del firmante desde el QR: aumenta para alejar del QR
      const nameYOffset = -45;  // Ajuste vertical del nombre del firmante: aumenta para bajar, disminuye para subir
      const signerNameFontSize = 45;  // Tamaño del nombre del firmante (11 = pequeño, 16–18 = más grande)
      const signerNameLineSpacing = 45;  // Espacio entre líneas del nombre (aumenta si subes signerNameFontSize)
      const checkScale = 0.80;  // Tamaño del check (0.08 = pequeño, 0.15–0.20 = más grande)
      const checkYOffset = 106;  // Separación entre nombre y check: aumenta para alejar el check del nombre
      
      // ============================================
      
      // Convertir el nombre a mayúsculas (uppercase) como en la imagen
      const recipientNameUpper = recipientName.toUpperCase();
      
      // Calcular posición centrada para el nombre (el ancho está bien, solo estiramos altura)
      const textWidth = font.widthOfTextAtSize(recipientNameUpper, fontSize);
      const centerX = width / 2;
      const textX = centerX - (textWidth / 2);
      
      // Para estirar solo la altura sin cambiar el ancho, usamos una transformación de matriz
      // Guardar el estado gráfico usando pushOperators
      const { PDFOperator, PDFNumber } = require('pdf-lib');
      
      // Guardar estado gráfico (q = save graphics state)
      page.pushOperators(PDFOperator.of('q', []));
      
      // Aplicar matriz de transformación: [1, 0, 0, scaleY, textX, nombreY]
      // Esto escala verticalmente (altura) sin cambiar el ancho
      // Matriz: [a b c d e f] donde a=1 (ancho normal), d=scaleY (altura escalada)
      page.pushOperators(
        PDFOperator.of('cm', [
          PDFNumber.of(1),        // a: Ancho normal (no escalar)
          PDFNumber.of(0),         // b
          PDFNumber.of(0),         // c
          PDFNumber.of(scaleY),    // d: Escalar altura
          PDFNumber.of(textX),     // e: Posición X
          PDFNumber.of(nombreY)    // f: Posición Y
        ])
      );
      
      // Dibujar el nombre del usuario en la plantilla con transformación
      // Usar posición (0, 0) porque la transformación ya incluye la posición
      // Color: negro (#000000) - RGB: (0, 0, 0) - bold sans-serif uppercase
      page.drawText(recipientNameUpper, {
        x: 0,
        y: 0,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0), // Color negro
      });
      
      // Restaurar estado gráfico (Q = restore graphics state)
      page.pushOperators(PDFOperator.of('Q', []));
      // Agregar sello/QR si se solicitó en metadata
      try {
        const metadata = certificateData.metadata as any;
        const includeStamp = metadata && typeof metadata.includeStamp !== 'undefined' ? metadata.includeStamp : true;
        if (includeStamp) {
          const issuerName = certificateData.issuerName || 'Movilis';
          const signatureData = metadata?.signature || {};
          const signerName = signatureData?.signerName || issuerName;
          const signatureReason = signatureData?.reason || 'Firmado por Instituto Superior Movilis';
          
          // QR contiene: nombre | razón | certificado
          const qrText = `${signerName} | ${signatureReason} | CERT-${certificateData.certificateNumber || ''}`;
          
          try {
            const qrBuffer = await this.generateQRCode(qrText);
            // Intentar insertar PNG/JPG generado por qrcode
            try {
              const pngImage = await pdfDoc.embedPng(qrBuffer);
              const pngDims = pngImage.scale(qrScale);
              const stampX = width - pngDims.width - stampXOffset; // Posición horizontal del QR
              page.drawImage(pngImage, { x: stampX, y: stampY, width: pngDims.width, height: pngDims.height });

              // Calcular posición del texto (nombre, check) a la derecha del QR
              const nameFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
              const textStartX = stampX + textStartXOffset; // Posición horizontal del nombre del firmante
              const imgHeight = pngDims.height || 100;
              const nameY = stampY + imgHeight + nameYOffset; // Posición vertical del nombre del firmante

              // Extraer datos de firma desde metadata (fallbacks)
              const signatureData = (certificateData.metadata as any)?.signature || (certificateData.metadata as any);
              const signerName = signatureData?.signerName || signatureData?.nombreFirmante || certificateData.issuerName || issuerName;
              const signatureReason = signatureData?.reason || signatureData?.signatureReason || signatureData?.razon || 'Firmado electrónicamente';

// Dibujar nombre en formato vertical (una línea por palabra)
                const nameLines = String(signerName).split(' ');
                let currentY = nameY;
                nameLines.forEach((line: string) => {
                  page.drawText(line, { x: textStartX, y: currentY, size: signerNameFontSize, font: nameFont, color: rgb(0,0,0) });
                  currentY -= signerNameLineSpacing;
                });
              
              // Intentar insertar check.png debajo del nombre (sin fecha)
              try {
                const checkPath = path.join(process.cwd(), 'public', 'images', 'check.png');
                if (fs.existsSync(checkPath)) {
                  const checkBuffer = fs.readFileSync(checkPath);
                  const checkImage = await pdfDoc.embedPng(checkBuffer);
                  const checkDims = checkImage.scale(checkScale);
                  const checkX = textStartX;
                  const checkY = currentY - checkYOffset;
                  page.drawImage(checkImage, { x: checkX, y: checkY, width: checkDims.width, height: checkDims.height });
                }
              } catch (checkErr) {
                console.warn('⚠️ [PDF] No se pudo insertar check.png en plantilla:', (checkErr as Error).message);
              }
            } catch (e) {
              try {
                const jpgImage = await pdfDoc.embedJpg(qrBuffer);
                const jpgDims = jpgImage.scale(qrScale);
                const stampX = width - jpgDims.width - stampXOffset;
                page.drawImage(jpgImage, { x: stampX, y: stampY, width: jpgDims.width, height: jpgDims.height });
              } catch (e2) {
                console.warn('⚠️ [PDF] No se pudo insertar QR en pdf-lib:', (e2 as Error).message);
              }
            }
          } catch (err) {
            console.warn('⚠️ [PDF] Error generando QR para plantilla:', (err as Error).message);
          }
        }
      } catch (err) {
        console.warn('⚠️ [PDF] Error agregando sello en plantilla:', (err as Error).message);
      }
      
      // Generar el PDF
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);
      console.log(`✅ [PDF] PDF generado desde plantilla (${pdfBuffer.length} bytes)`);
      return pdfBuffer;
      
    } catch (error) {
      const err = error as Error;
      console.error('❌ [PDF] Error generando PDF con plantilla:', err.message);
      console.error('   Stack:', err.stack);
      console.warn('   Usando método alternativo (sin plantilla)');
      // Fallback a generación sin plantilla
      return await this.generateCertificateBuffer(certificateData);
    }
  }

  /**
   * Genera un certificado en PDF (método original con PDFKit)
   */
  async generateCertificate(certificateData: CertificateData): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          certificateNumber,
          recipientName,
          courseName,
          courseDescription,
          issueDate,
          expirationDate,
          issuerName = 'Movilis',
          metadata = {},
          fontName = this.defaultFont
        } = certificateData;

        // Obtener la ruta de la fuente
        const fontPath = this.fonts[fontName] || this.fonts[this.defaultFont];
        
        // Nombre del archivo
        const fileName = `certificate-${certificateNumber}-${Date.now()}.pdf`;
        const filePath = path.join(this.certificatesDir, fileName);

        // Crear documento PDF
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'landscape',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });
        
        // Registrar la fuente personalizada
        if (fs.existsSync(fontPath)) {
          doc.registerFont('CustomFont', fontPath);
        }

        // Pipe al archivo
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Fondo decorativo (opcional)
        this._drawBackground(doc);

        // Usar la fuente personalizada si está disponible, de lo contrario usar Helvetica
        const titleFont = fs.existsSync(fontPath) ? 'CustomFont' : 'Helvetica-Bold';
        const bodyFont = fs.existsSync(fontPath) ? 'CustomFont' : 'Helvetica';
        
        // Ajustar tamaños de fuente para la fuente personalizada
        const titleFontSize = fs.existsSync(fontPath) ? 42 : 36;
        const subtitleFontSize = fs.existsSync(fontPath) ? 22 : 18;
        const nameFontSize = fs.existsSync(fontPath) ? 32 : 28;
        const bodyFontSize = fs.existsSync(fontPath) ? 20 : 16;
        const courseFontSize = fs.existsSync(fontPath) ? 26 : 22;

        // Título del certificado
        doc.fontSize(titleFontSize)
          .fillColor('#1a1a1a')
          .font(titleFont)
          .text('CERTIFICADO', {
            align: 'center',
            y: 150
          } as any);

        // Subtítulo
        doc.fontSize(subtitleFontSize)
          .fillColor('#666666')
          .font(bodyFont)
          .text('de Finalización', {
            align: 'center',
            y: 200
          } as any);

        // Nombre del destinatario
        doc.fontSize(nameFontSize)
          .fillColor('#1a1a1a')
          .font(titleFont)
          .text(recipientName, {
            align: 'center',
            y: 280
          } as any);

        // Texto de certificación
        doc.fontSize(bodyFontSize)
          .fillColor('#333333')
          .font(bodyFont)
          .text('ha completado exitosamente el curso', {
            align: 'center',
            y: 340
          } as any);

        // Nombre del curso
        doc.fontSize(courseFontSize)
          .fillColor('#1a1a1a')
          .font(titleFont)
          .text(courseName, {
            align: 'center',
            y: 380
          } as any);

        // Descripción del curso (si existe)
        if (courseDescription) {
          doc.fontSize(12)
            .fillColor('#666666')
            .font('Helvetica')
            .text(courseDescription, {
              align: 'center',
              y: 420,
              width: 600
            } as any);
        }

        // Fecha de emisión
        const formattedDate = new Date(issueDate).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        doc.fontSize(12)
          .fillColor('#333333')
          .font('Helvetica')
          .text(`Emitido el ${formattedDate}`, {
            align: 'center',
            y: 480
          } as any);

        // Fecha de expiración (si existe)
        if (expirationDate) {
          const formattedExpDate = new Date(expirationDate).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          doc.fontSize(10)
            .fillColor('#666666')
            .font('Helvetica')
            .text(`Válido hasta: ${formattedExpDate}`, {
              align: 'center',
              y: 500
            } as any);
        }

        // Número de certificado
        doc.fontSize(10)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Número de Certificado: ${certificateNumber}`, {
            align: 'center',
            y: 520
          } as any);

        // Línea de firma
        doc.moveTo(150, 550)
          .lineTo(300, 550)
          .strokeColor('#333333')
          .lineWidth(1)
          .stroke();

        doc.moveTo(450, 550)
          .lineTo(600, 550)
          .strokeColor('#333333')
          .lineWidth(1)
          .stroke();

        doc.fontSize(10)
          .fillColor('#333333')
          .font('Helvetica')
          .text('Firma del Emisor', 150, 560, { width: 150, align: 'center' })
          .text('Firma del Director', 450, 560, { width: 150, align: 'center' });

        // Footer
        doc.fontSize(8)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Emitido por: ${issuerName}`, {
            align: 'center',
            y: 600
          } as any);

        // Agregar QR, datos de firma (nombre → check debajo, sin fecha) más pegado al QR
        try {
          const metadata = (certificateData as any).metadata as any;
          const includeStamp = metadata && typeof metadata.includeStamp !== 'undefined' ? metadata.includeStamp : true;
          if (includeStamp) {
            const signatureData = metadata?.signature || metadata || {};
            const signerName = signatureData?.signerName || signatureData?.nombreFirmante || issuerName;
            const signatureReason = signatureData?.reason || 'Firmado por Instituto Superior Movilis';
            
            // QR contiene: nombre | razón | certificado
            const qrText = `${signerName} | ${signatureReason} | CERT-${certificateNumber || ''}`;
            try {
              const qrBuffer = await this.generateQRCode(qrText);
              // Posiciones relativas en landscape LETTER
              const stampX = (doc.page.width || 792) - 140; // QR a la DERECHA (lado vacío)
              const stampY = 40;
              const qrSize = 120;
              // Insertar QR
              try {
                doc.image(qrBuffer, stampX, stampY, { width: qrSize, height: qrSize });
              } catch (imgErr) {
                // Si falla con buffer, intentar escribir temporal y cargar
                try {
                  const tmpPath = path.join(this.certificatesDir, `tmp_qr_${Date.now()}.png`);
                  fs.writeFileSync(tmpPath, qrBuffer);
                  doc.image(tmpPath, stampX, stampY, { width: qrSize, height: qrSize });
                  fs.unlinkSync(tmpPath);
                } catch (tmpErr) {
                  console.warn('⚠️ [PDF] No se pudo insertar QR en PDFKit:', (tmpErr as Error).message);
                }
              }

              // Extraer datos de firma desde metadata (fallbacks)
              const signatureData = metadata?.signature || metadata || {};
              const signerName = signatureData?.signerName || signatureData?.nombreFirmante || issuerName;

              // Posición del nombre a la IZQUIERDA del QR (pegadito)
              const textStartX = stampX - 100; // nombre pegadito a la izquierda del QR
              const nameY = stampY + qrSize - 12;

              // Dibujar nombre en formato vertical
              const nameLines = String(signerName).split(' ');
              let currentY = nameY;
              nameLines.forEach((line: string) => {
                doc.font('Helvetica-Bold').fillColor('#000000').fontSize(11).text(line, textStartX, currentY, { width: 220 });
                currentY -= 15;
              });

              // Insertar imagen check.png debajo del nombre (si existe)
              const checkPath = path.join(process.cwd(), 'public', 'images', 'check.png');
              if (fs.existsSync(checkPath)) {
                try {
                  const checkSize = 20;
                  const checkX = textStartX;
                  const checkY = currentY - 8; // debajo del nombre
                  doc.image(checkPath, checkX, checkY, { width: checkSize, height: checkSize });
                } catch (checkErr) {
                  console.warn('⚠️ [PDF] No se pudo insertar check.png en PDFKit:', (checkErr as Error).message);
                }
              }
            } catch (qrErr) {
              console.warn('⚠️ [PDF] Error generando QR para PDFKit:', (qrErr as Error).message);
            }
          }
        } catch (err) {
          console.warn('⚠️ [PDF] No se pudo agregar sello/QR en PDFKit:', (err as Error).message);
        }

        // Mantener sello decorativo (no destruye la funcionalidad previa)
        try {
          const metadata = (certificateData as any).metadata as any;
          const includeStamp = metadata && typeof metadata.includeStamp !== 'undefined' ? metadata.includeStamp : true;
          if (includeStamp) {
            this.drawValidationStamp(doc, 680, 460);
          }
        } catch (err) {
          console.warn('⚠️ [PDF] No se pudo dibujar el sello (posterior):', (err as Error).message);
        }

        // Finalizar documento
        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Dibuja un fondo decorativo para el certificado
   * (se usa `any` para evitar problemas con los tipos de PDFKit)
   */
  private _drawBackground(doc: any): void {
    // Borde decorativo
    doc.rect(30, 30, 750, 550)
      .lineWidth(3)
      .strokeColor('#cccccc')
      .stroke();

    // Borde interno
    doc.rect(40, 40, 730, 530)
      .lineWidth(1)
      .strokeColor('#e0e0e0')
      .stroke();

    // Decoración en las esquinas (opcional)
    const cornerSize = 30;
    const positions = [
      { x: 30, y: 30 },
      { x: 780, y: 30 },
      { x: 30, y: 580 },
      { x: 780, y: 580 }
    ];

    positions.forEach(pos => {
      doc.rect(pos.x, pos.y, cornerSize, cornerSize)
        .lineWidth(2)
        .strokeColor('#cccccc')
        .stroke();
    });
  }

  /**
   * Dibuja un sello de validación en el PDF (usa PDFKit primitives)
   */
  private drawValidationStamp(doc: any, x: number, y: number) {
    // Guardar estado actual
    doc.save();
    
    // Colores
    const primaryColor = '#0066cc';
    const textColor = '#333333';
    const size = 100;
    
    // Círculo exterior
    doc.circle(x + size/2, y + size/2, size/2)
       .lineWidth(2)
       .stroke(primaryColor);
    
    // Texto curvo superior
    doc.fontSize(8)
       .fill(primaryColor)
       .text('VALIDO Y AUTENTICO', x + 10, y + 20, {
         width: size - 20,
         align: 'center',
         characterSpacing: 1.5
       });
    
    // Ícono de verificación
    doc.fontSize(30)
       .fill(primaryColor)
       .text('✓', x + size/2 - 8, y + size/2 - 10);
    
    // Texto inferior
    doc.fontSize(6)
       .fill(textColor)
       .text('Time Stamping', x + 10, y + size - 30, {
         width: size - 20,
         align: 'center'
       })
       .text('Security Data', x + 10, y + size - 20, {
         width: size - 20,
         align: 'center'
       });
    
    // Restaurar estado
    doc.restore();
  }

  /**
   * Genera un código QR puro (sin composición)
   */
  private async generateQRCode(text: string): Promise<Buffer> {
    const qr = await import('qrcode');
    
    // Generar QR grande
    const qrBuffer: Buffer = await new Promise((resolve, reject) => {
      qr.toBuffer(text, {
        width: 500,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err: Error | null | undefined, buffer: Buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    return qrBuffer;
  }

  /**
   * Elimina un archivo PDF
   */
  async deleteCertificateFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      return false;
    }
  }

  /**
   * Obtiene el buffer del PDF (para envío directo sin guardar)
   */
  async generateCertificateBuffer(certificateData: CertificateData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          certificateNumber,
          recipientName,
          courseName,
          courseDescription,
          issueDate,
          expirationDate,
          issuerName = 'Movilis'
        } = certificateData;

        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'landscape',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Mismo contenido que generateCertificate pero sin guardar
        this._drawBackground(doc);

        doc.fontSize(36)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text('CERTIFICADO', { align: 'center', y: 150 } as any);

        doc.fontSize(18)
          .fillColor('#666666')
          .font('Helvetica')
          .text('de Finalización', { align: 'center', y: 200 } as any);

        doc.fontSize(28)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text(recipientName, { align: 'center', y: 280 } as any);

        doc.fontSize(16)
          .fillColor('#333333')
          .font('Helvetica')
          .text('ha completado exitosamente el curso', { align: 'center', y: 340 } as any);

        doc.fontSize(22)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text(courseName, { align: 'center', y: 380 } as any);

        if (courseDescription) {
          doc.fontSize(12)
            .fillColor('#666666')
            .font('Helvetica')
            .text(courseDescription, { align: 'center', y: 420, width: 600 } as any);
        }

        const formattedDate = new Date(issueDate).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        doc.fontSize(12)
          .fillColor('#333333')
          .font('Helvetica')
          .text(`Emitido el ${formattedDate}`, { align: 'center', y: 480 } as any);

        if (expirationDate) {
          const formattedExpDate = new Date(expirationDate).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          doc.fontSize(10)
            .fillColor('#666666')
            .font('Helvetica')
            .text(`Válido hasta: ${formattedExpDate}`, { align: 'center', y: 500 } as any);
        }

        doc.fontSize(10)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Número de Certificado: ${certificateNumber}`, { align: 'center', y: 520 } as any);

        doc.moveTo(150, 550)
          .lineTo(300, 550)
          .strokeColor('#333333')
          .lineWidth(1)
          .stroke();

        doc.moveTo(450, 550)
          .lineTo(600, 550)
          .strokeColor('#333333')
          .lineWidth(1)
          .stroke();

        doc.fontSize(10)
          .fillColor('#333333')
          .font('Helvetica')
          .text('Firma del Emisor', 150, 560, { width: 150, align: 'center' })
          .text('Firma del Director', 450, 560, { width: 150, align: 'center' });

        doc.fontSize(8)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Emitido por: ${issuerName}`, { align: 'center', y: 600 } as any);
        // Agregar QR, datos de firma (nombre → check debajo, sin fecha) más pegado al QR (buffer flow)
        try {
          const metadata = (certificateData as any).metadata as any;
          const includeStamp = metadata && typeof metadata.includeStamp !== 'undefined' ? metadata.includeStamp : true;
          if (includeStamp) {
            const signatureData = metadata?.signature || metadata || {};
            const signerName = signatureData?.signerName || signatureData?.nombreFirmante || issuerName;
            const signatureReason = signatureData?.reason || 'Firmado por Instituto Superior Movilis';
            
            // QR contiene: nombre | razón | certificado
            const qrText = `${signerName} | ${signatureReason} | CERT-${certificateNumber || ''}`;
            try {
              const qrBuffer = await this.generateQRCode(qrText);
              const stampX = (doc.page.width || 792) - 140; // QR a la DERECHA (lado vacío)
              const stampY = 40;
              const qrSize = 120;
              try {
                doc.image(qrBuffer, stampX, stampY, { width: qrSize, height: qrSize });
              } catch (imgErr) {
                try {
                  const tmpPath = path.join(this.certificatesDir, `tmp_qr_${Date.now()}.png`);
                  fs.writeFileSync(tmpPath, qrBuffer);
                  doc.image(tmpPath, stampX, stampY, { width: qrSize, height: qrSize });
                  fs.unlinkSync(tmpPath);
                } catch (tmpErr) {
                  console.warn('⚠️ [PDF] No se pudo insertar QR en buffer PDFKit:', (tmpErr as Error).message);
                }
              }

              const signatureData = metadata?.signature || metadata || {};
              const signerName = signatureData?.signerName || signatureData?.nombreFirmante || issuerName;
              const signatureReason = signatureData?.reason || signatureData?.signatureReason || signatureData?.razon || 'Firmado electrónicamente';
              const signatureDateRaw = signatureData?.date || signatureData?.signatureDate || issueDate;
              const signatureDate = signatureDateRaw ? new Date(signatureDateRaw).toLocaleDateString('es-ES') : '';

              // Posición del nombre a la IZQUIERDA del QR (pegadito)
              const textStartX = stampX - 100; // nombre pegadito a la izquierda del QR
              const nameY = stampY + qrSize - 12;

              // Dibujar nombre en formato vertical
              const nameLines = String(signerName).split(' ');
              let currentY = nameY;
              nameLines.forEach((line: string) => {
                doc.font('Helvetica-Bold').fillColor('#000000').fontSize(11).text(line, textStartX, currentY, { width: 220 });
                currentY -= 15;
              });

              // Insertar check.png debajo del nombre
              const checkPath = path.join(process.cwd(), 'public', 'images', 'check.png');
              if (fs.existsSync(checkPath)) {
                try {
                  const checkSize = 20;
                  const checkX = textStartX;
                  const checkY = currentY - 8;
                  doc.image(checkPath, checkX, checkY, { width: checkSize, height: checkSize });
                } catch (checkErr) {
                  console.warn('⚠️ [PDF] No se pudo insertar check.png en buffer PDFKit:', (checkErr as Error).message);
                }
              }
            } catch (qrErr) {
              console.warn('⚠️ [PDF] Error generando QR para buffer PDFKit:', (qrErr as Error).message);
            }
          }
        } catch (err) {
          console.warn('⚠️ [PDF] No se pudo agregar sello/QR en buffer PDFKit:', (err as Error).message);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Firma electrónicamente un PDF usando un certificado .p12
   * Prioriza variables de entorno, luego parámetros, luego base de datos
   */
  async signPDF(pdfBuffer: Buffer, p12Buffer: Buffer, password: string): Promise<Buffer> {
    try {
      let p12FileBuffer: Buffer | null = null;
      let p12Password: string | null = null;

      // 1. Prioridad: Variables de entorno (configuración principal)
      // Opción A: P12_BASE64 (archivo completo en base64) - MEJOR para Vercel
      const p12Base64 = process.env.P12_BASE64;
      const envPassword = process.env.P12_PASSWORD;

      if (p12Base64 && envPassword) {
        try {
          // Limpiar el base64: eliminar espacios, saltos de línea, etc.
          const cleanBase64 = p12Base64.replace(/\s/g, '').trim();
          
          // Validar que el base64 no esté vacío
          if (!cleanBase64 || cleanBase64.length < 100) {
            throw new Error('P12_BASE64 parece estar vacío o incompleto');
          }
          
          // Decodificar base64 a Buffer
          p12FileBuffer = Buffer.from(cleanBase64, 'base64');
          
          // Validar que el buffer tenga un tamaño razonable (un P12 típico tiene al menos 1KB)
          if (!p12FileBuffer || p12FileBuffer.length < 1024) {
            throw new Error(`P12_BASE64 decodificado es muy pequeño (${p12FileBuffer?.length || 0} bytes). Un certificado P12 válido debe tener al menos 1KB`);
          }
          
          p12Password = envPassword;
          console.log(`🔏 [signPDF] Usando certificado desde P12_BASE64 (variables de entorno) - Tamaño: ${p12FileBuffer.length} bytes`);
        } catch (error) {
          const err = error as Error;
          console.error('❌ Error decodificando P12_BASE64:', err.message);
          console.error('   Longitud del base64:', p12Base64.length);
          // No continuar si hay error con P12_BASE64
          throw err;
        }
      }

      // Opción B: P12_PATH (ruta al archivo) - Para desarrollo local
      if (!p12FileBuffer || !p12Password) {
        const p12Path = process.env.P12_PATH;
        if (p12Path && envPassword) {
          if (fs.existsSync(p12Path)) {
            p12FileBuffer = fs.readFileSync(p12Path);
            p12Password = envPassword;
            console.log('🔏 [signPDF] Usando certificado desde P12_PATH (variables de entorno)');
          } else {
            console.warn('⚠️ Archivo .p12 no encontrado en la ruta configurada:', p12Path);
          }
        }
      }

      // 2. Fallback: Parámetros proporcionados (si no hay variables de entorno)
      if (!p12FileBuffer || !p12Password) {
        if (p12Buffer && p12Buffer.length > 0 && password) {
          p12FileBuffer = p12Buffer;
          p12Password = password;
          console.log('🔏 [signPDF] Usando certificado desde parámetros');
        }
      }

      // 3. Si no hay certificado disponible, detener con error claro
      if (!p12FileBuffer || !p12Password) {
        throw new Error('No se encontró certificado P12: revise P12_PATH/P12_PASSWORD o provea buffer y password.');
      }

      // Usar @signpdf/signpdf y @signpdf/signer-p12
      const signpdf = require('@signpdf/signpdf').default;
      const { P12Signer } = require('@signpdf/signer-p12');
      
      console.log('🔏 [signPDF] Iniciando proceso de firma...');

      // Crear el signer con el certificado P12
      console.log('🔏 [signPDF] Creando signer con certificado P12...');
      console.log(`   - Tamaño del certificado: ${p12FileBuffer.length} bytes`);
      console.log(`   - Password proporcionada: ${p12Password ? 'Sí' : 'No'} (longitud: ${p12Password?.length || 0})`);
      
      let signer;
      try {
        signer = new P12Signer(p12FileBuffer, {
          passphrase: p12Password
        });
        console.log('✅ Signer creado correctamente');
      } catch (signerError) {
        const err = signerError as Error;
        console.error('❌ Error creando P12Signer:', err.message);
        console.error('   Esto puede indicar:');
        console.error('   1. El certificado P12 está corrupto o incompleto');
        console.error('   2. La contraseña (P12_PASSWORD) es incorrecta');
        console.error('   3. El base64 del certificado está truncado o mal formateado');
        throw new Error(`No se pudo crear el signer P12: ${err.message}. Verifique P12_BASE64 y P12_PASSWORD.`);
      }

      // Intentar usar placeholder-pdf-lib primero (para PDFs generados con pdf-lib)
      // Si falla, intentar con placeholder-plain (para PDFs normales)
      let pdfWithPlaceholder: Buffer;
      
      try {
        console.log('🔏 [signPDF] Intentando agregar placeholder con pdf-lib...');
        // Intentar cargar el PDF con pdf-lib para usar placeholder-pdf-lib
        const pdfDoc = await PDFLibDocument.load(pdfBuffer);
        const { pdflibAddPlaceholder } = require('@signpdf/placeholder-pdf-lib');
        
        // Agregar placeholder usando pdf-lib
        // Aumentar signatureLength para certificados grandes (por defecto es 8192)
        // Usamos 20000 para dar margen suficiente
        pdflibAddPlaceholder({
          pdfDoc,
          reason: 'Firmado electrónicamente por Movilis',
          contactInfo: 'soporte@movilis.com',
          name: 'Movilis',
          location: 'Ecuador',
          signatureLength: 20000 // Aumentar el tamaño del placeholder para certificados grandes
        });
        
        // Guardar el PDF con el placeholder
        const pdfBytes = await pdfDoc.save();
        pdfWithPlaceholder = Buffer.from(pdfBytes);
        
        console.log('✅ Placeholder agregado usando @signpdf/placeholder-pdf-lib');
      } catch (placeholderError) {
        // Si falla con pdf-lib, intentar con placeholder-plain
        const err = placeholderError as Error;
        console.log(`⚠️ No se pudo usar placeholder-pdf-lib (${err.message}), intentando con placeholder-plain...`);
        
        try {
          const { plainAddPlaceholder } = require('@signpdf/placeholder-plain');
          pdfWithPlaceholder = plainAddPlaceholder({
            pdfBuffer: pdfBuffer,
            reason: 'Firmado electrónicamente por Movilis',
            contactInfo: 'soporte@movilis.com',
            name: 'Movilis',
            location: 'Ecuador',
            signatureLength: 20000 // Aumentar el tamaño del placeholder para certificados grandes
          });
          console.log('✅ Placeholder agregado usando @signpdf/placeholder-plain');
        } catch (plainError) {
          const plainErr = plainError as Error;
          console.error('❌ Error agregando placeholder con ambos métodos:', plainErr.message);
          console.error('Stack:', plainErr.stack);
          throw new Error(`No se pudo agregar placeholder al PDF: ${plainErr.message}`);
        }
      }

      // Verificar que el placeholder se agregó correctamente
      if (!pdfWithPlaceholder || pdfWithPlaceholder.length === 0) {
        throw new Error('El PDF con placeholder está vacío');
      }
      console.log(`✅ PDF con placeholder listo (tamaño: ${pdfWithPlaceholder.length} bytes)`);

      // Firmar el PDF (sign solo acepta pdfBuffer, signer y opcionalmente signingTime)
      console.log('🔏 [signPDF] Firmando PDF...');
      const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);

      if (!signedPdf || signedPdf.length === 0) {
        throw new Error('El PDF firmado está vacío');
      }

      console.log(`✅ [signPDF] PDF firmado correctamente (tamaño: ${signedPdf.length} bytes)`);

      // Convertir a Buffer si es necesario
      return Buffer.isBuffer(signedPdf) ? signedPdf : Buffer.from(signedPdf);

    } catch (error) {
      const err = error as Error & { stack?: string };
      console.error('❌ Error firmando PDF:', err.message);
      if (err.stack) {
        console.error('Stack de error en signPDF:', err.stack);
      }
      // En caso de error, devolver el PDF original sin firmar para no romper el flujo
      return pdfBuffer;
    }
  }
}

export default new PDFService();


