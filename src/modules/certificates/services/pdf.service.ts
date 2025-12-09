import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import userService from '../../users/services/user.postgres.service';

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
    // Crear directorio de certificados si no existe
    this.certificatesDir = path.join(__dirname, '../../../uploads/certificates');
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
    
    // Ruta a la plantilla PDF
    this.templatePath = path.join(__dirname, '../templates/certificado.pdf');
    
    // Directorio de fuentes
    this.fontsDir = path.join(__dirname, '../../../public/fonts');
    if (!fs.existsSync(this.fontsDir)) {
      fs.mkdirSync(this.fontsDir, { recursive: true });
    }
    
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
   */
  async signPDF(pdfBuffer: Buffer, _p12Buffer: Buffer, _password: string): Promise<Buffer> {
    try {
      // Leer configuración desde variables de entorno (modo prueba)
      const p12Path = process.env.P12_PATH;
      const p12Password = process.env.P12_PASSWORD;

      if (!p12Path || !p12Password) {
        console.warn('⚠️ P12_PATH o P12_PASSWORD no configurados. Se devuelve el PDF sin firmar.');
        return pdfBuffer;
      }

      if (!fs.existsSync(p12Path)) {
        console.warn('⚠️ Archivo .p12 no encontrado en la ruta configurada:', p12Path);
        return pdfBuffer;
      }

      const p12FileBuffer = fs.readFileSync(p12Path);

      // Cargar pdf-signer en tiempo de ejecución
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sign } = require('pdf-signer');

      console.log('🔏 [signPDF] Firmando PDF con pdf-signer...');

      const signedPdf: Buffer = await sign(pdfBuffer, p12FileBuffer, p12Password, {
        reason: 'Firmado electrónicamente por Movilis',
        email: 'soporte@movilis.com',
        name: 'Movilis',
        location: 'Ecuador',
        // signingDate se puede omitir para usar la fecha actual
      });

      console.log('✅ [signPDF] PDF firmado correctamente con pdf-signer.');

      return signedPdf;

    } catch (error) {
      const err = error as Error & { stack?: string };
      console.error('Error firmando PDF con pdf-signer:', err.message);
      if (err.stack) {
        console.error('Stack de error en signPDF (pdf-signer):', err.stack);
      }
      // En caso de error, devolver el PDF original sin firmar para no romper el flujo
      return pdfBuffer;
    }
  }
}

export default new PDFService();


