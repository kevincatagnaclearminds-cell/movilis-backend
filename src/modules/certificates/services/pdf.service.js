const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const userService = require('../../users/services/user.postgres.service');


class PDFService {
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
    // Puedes agregar más fuentes aquí simplemente añadiendo nuevas propiedades
    this.fonts = {
      alexBrush: path.join(this.fontsDir, 'AlexBrush-Regular.ttf'),
      // Agrega más fuentes aquí, por ejemplo:
      // customFont: path.join(this.fontsDir, 'MiFuente.ttf'),
      // otraFuente: path.join(this.fontsDir, 'OtraFuente.ttf'),
    };
    
    // Fuente por defecto (puedes cambiarla aquí)
    this.defaultFont = 'alexBrush';
  }

  /**
   * Genera un certificado en PDF usando la plantilla base
   * Obtiene el nombre del usuario desde PostgreSQL
   * @param {Object} certificateData - Datos del certificado
   * @param {string} recipientCedula - Cédula del destinatario (opcional, para buscar en BD)
   * @returns {Promise<Buffer>} - Buffer del PDF generado
   */
  async generateCertificateFromTemplate(certificateData, recipientCedula = null) {
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
          console.warn('No se pudo obtener el usuario de la BD, usando nombre del certificado:', error.message);
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
      let fontPath = null;
      if (this.fonts[fontName] && fs.existsSync(this.fonts[fontName])) {
        fontPath = this.fonts[fontName];
      } else if (this.fonts[this.defaultFont] && fs.existsSync(this.fonts[this.defaultFont])) {
        fontPath = this.fonts[this.defaultFont];
      }
      
      let font;
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
        console.warn('No se pudo cargar la fuente personalizada, usando Helvetica:', error.message);
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
      console.error('Error generando PDF con plantilla:', error);
      // Fallback a generación sin plantilla
      return await this.generateCertificateBuffer(certificateData);
    }
  }

  /**
   * Genera un certificado en PDF (método original con PDFKit)
   * @param {Object} certificateData - Datos del certificado
   * @returns {Promise<string>} - Ruta del archivo PDF generado
   */
  async generateCertificate(certificateData) {
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
          });

        // Subtítulo
        doc.fontSize(18)
          .fillColor('#666666')
          .font('Helvetica')
          .text('de Finalización', {
            align: 'center',
            y: 200
          });

        // Nombre del destinatario
        doc.fontSize(28)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text(recipientName, {
            align: 'center',
            y: 280
          });

        // Texto de certificación
        doc.fontSize(16)
          .fillColor('#333333')
          .font('Helvetica')
          .text('ha completado exitosamente el curso', {
            align: 'center',
            y: 340
          });

        // Nombre del curso
        doc.fontSize(22)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text(courseName, {
            align: 'center',
            y: 380
          });

        // Descripción del curso (si existe)
        if (courseDescription) {
          doc.fontSize(12)
            .fillColor('#666666')
            .font('Helvetica')
            .text(courseDescription, {
              align: 'center',
              y: 420,
              width: 600
            });
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
          });

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
            });
        }

        // Número de certificado
        doc.fontSize(10)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Número de Certificado: ${certificateNumber}`, {
            align: 'center',
            y: 520
          });

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
          });

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
   * @private
   */
  _drawBackground(doc) {
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
   * @param {string} filePath - Ruta del archivo a eliminar
   */
  async deleteCertificateFile(filePath) {
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
   * @param {Object} certificateData - Datos del certificado
   * @returns {Promise<Buffer>} - Buffer del PDF
   */
  async generateCertificateBuffer(certificateData) {
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

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Mismo contenido que generateCertificate pero sin guardar
        this._drawBackground(doc);

        doc.fontSize(36)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text('CERTIFICADO', { align: 'center', y: 150 });

        doc.fontSize(18)
          .fillColor('#666666')
          .font('Helvetica')
          .text('de Finalización', { align: 'center', y: 200 });

        doc.fontSize(28)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text(recipientName, { align: 'center', y: 280 });

        doc.fontSize(16)
          .fillColor('#333333')
          .font('Helvetica')
          .text('ha completado exitosamente el curso', { align: 'center', y: 340 });

        doc.fontSize(22)
          .fillColor('#1a1a1a')
          .font('Helvetica-Bold')
          .text(courseName, { align: 'center', y: 380 });

        if (courseDescription) {
          doc.fontSize(12)
            .fillColor('#666666')
            .font('Helvetica')
            .text(courseDescription, { align: 'center', y: 420, width: 600 });
        }

        const formattedDate = new Date(issueDate).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        doc.fontSize(12)
          .fillColor('#333333')
          .font('Helvetica')
          .text(`Emitido el ${formattedDate}`, { align: 'center', y: 480 });

        if (expirationDate) {
          const formattedExpDate = new Date(expirationDate).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          doc.fontSize(10)
            .fillColor('#666666')
            .font('Helvetica')
            .text(`Válido hasta: ${formattedExpDate}`, { align: 'center', y: 500 });
        }

        doc.fontSize(10)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Número de Certificado: ${certificateNumber}`, { align: 'center', y: 520 });

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
          .text(`Emitido por: ${issuerName}`, { align: 'center', y: 600 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Firma electrónicamente un PDF usando un certificado .p12
   * @param {Buffer} pdfBuffer - Buffer del PDF sin firmar
   * @param {Buffer} p12Buffer - Buffer del archivo .p12
   * @param {string} password - Contraseña del certificado .p12
   * @returns {Promise<Buffer>} - Buffer del PDF firmado
   */
  async signPDF(pdfBuffer, p12Buffer, password) {
    try {
      // Cargar el certificado .p12
      const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      
      // Obtener la clave privada y el certificado
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (!keyBag || keyBag.length === 0) {
        throw new Error('No se encontró la clave privada en el certificado .p12');
      }
      const privateKey = keyBag[0].key;
      
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag];
      if (!certBag || certBag.length === 0) {
        throw new Error('No se encontró el certificado en el archivo .p12');
      }
      const certificate = certBag[0].cert;
      
      // Nota: Para una firma PDF real y válida, necesitarías usar una librería especializada
      // como node-signpdf. Por ahora, retornamos el PDF original.
      // TODO: Implementar firma PDF completa con node-signpdf cuando sea necesario
      
      return pdfBuffer; // Por ahora retornamos el PDF sin modificar
      
    } catch (error) {
      console.error('Error procesando certificado .p12:', error.message);
      throw new Error(`Error al procesar el certificado .p12: ${error.message}`);
    }
  }
}

module.exports = new PDFService();
