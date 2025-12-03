const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    // Crear directorio de certificados si no existe
    this.certificatesDir = path.join(__dirname, '../../../uploads/certificates');
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
  }

  /**
   * Genera un certificado en PDF
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
}

module.exports = new PDFService();

