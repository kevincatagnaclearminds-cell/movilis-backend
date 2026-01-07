import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import * as dotenv from 'dotenv';
import userService from '../../users/services/user.prisma.service';

// Cargar variables de entorno (.env) para obtener P12_PATH y P12_PASSWORD
dotenv.config();

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
  private templatePath: string;
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
      this.fontsDir = path.join(__dirname, '../../../public/fonts');
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
    
    // Ruta a la plantilla PDF
    this.templatePath = path.join(__dirname, '../templates/certificado.pdf');
    
    // Rutas a las fuentes disponibles
    this.fonts = {
      alexBrush: path.join(this.fontsDir, 'AlexBrush-Regular.ttf'),
    };
    
    // Fuente por defecto
    this.defaultFont = 'alexBrush';
  }

  /**
   * Genera un certificado en PDF usando la plantilla base
   */
  async generateCertificateFromTemplate(certificateData: CertificateData, recipientCedula: string | null = null): Promise<Buffer> {
    try {
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
        console.warn('Plantilla PDF no encontrada, usando generación sin plantilla');
        return await this.generateCertificateBuffer(certificateData);
      }

      // Cargar la plantilla PDF
      const templateBytes = fs.readFileSync(this.templatePath);
      
      // Cargar el PDF
      const pdfDoc = await PDFLibDocument.load(templateBytes);
      
      // Obtener la primera página
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        throw new Error('La plantilla PDF no contiene páginas');
      }
      const page = pages[0];
      const { width } = page.getSize();
      
      // Determinar qué fuente usar
      const fontName = certificateData.fontName || this.defaultFont;
      let fontPath: string | null = null;
      if (this.fonts[fontName] && fs.existsSync(this.fonts[fontName])) {
        fontPath = this.fonts[fontName];
      } else if (this.fonts[this.defaultFont] && fs.existsSync(this.fonts[this.defaultFont])) {
        fontPath = this.fonts[this.defaultFont];
      }
      
      let font: PDFFont;
      const fontSize = 50;
      
      try {
        if (fontPath) {
          // Registrar fontkit si está disponible
          try {
            const fontkit = require('@btielen/pdf-lib-fontkit');
            pdfDoc.registerFontkit(fontkit);
          } catch (e) {
            // Si no está disponible, continuar sin fontkit
          }
          
          // Leer el archivo de fuente
          const fontBuffer = fs.readFileSync(fontPath);
          const fontBytes = new Uint8Array(fontBuffer);
          font = await pdfDoc.embedFont(fontBytes);
        } else {
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }
      } catch (error) {
        const err = error as Error;
        console.warn('No se pudo cargar la fuente personalizada, usando Helvetica:', err.message);
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
      
      // Calcular posición centrada para el nombre
      const textWidth = font.widthOfTextAtSize(recipientName, fontSize);
      const centerX = width / 2;
      const textX = centerX - (textWidth / 2);
      const nombreY = 320;
      
      // Dibujar el nombre del usuario en la plantilla
      page.drawText(recipientName, {
        x: textX,
        y: nombreY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Generar el PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      const err = error as Error;
      console.error('Error generando PDF con plantilla:', err);
      // Fallback a generación sin plantilla
      return await this.generateCertificateBuffer(certificateData);
    }
  }

  /**
   * Genera un certificado en PDF (método original con PDFKit)
   */
  async generateCertificate(certificateData: CertificateData): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const {
          certificateNumber,
          recipientName,
          courseName,
          courseDescription,
          issueDate,
          expirationDate,
          issuerName = 'Movilis',
          metadata = {}
        } = certificateData;

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

        // Pipe al archivo
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Fondo decorativo (opcional)
        this._drawBackground(doc);

        // Título del certificado
        doc.fontSize(36)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text('CERTIFICADO', {
            align: 'center',
            y: 150
          } as any);

        // Subtítulo
        doc.fontSize(18)
          .fillColor('#666666')
          .font('Helvetica')
          .text('de Finalización', {
            align: 'center',
            y: 200
          } as any);

        // Nombre del destinatario
        doc.fontSize(28)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text(recipientName, {
            align: 'center',
            y: 280
          } as any);

        // Texto de certificación
        doc.fontSize(16)
          .fillColor('#333333')
          .font('Helvetica')
          .text('ha completado exitosamente el curso', {
            align: 'center',
            y: 340
          } as any);

        // Nombre del curso
        doc.fontSize(22)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
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
    return new Promise((resolve, reject) => {
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


