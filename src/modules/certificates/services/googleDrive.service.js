const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
  constructor() {
    // Inicializar cliente de Google Drive
    this.drive = null;
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
    this.initializeDrive();
  }

  /**
   * Inicializa el cliente de Google Drive usando Service Account
   */
  initializeDrive() {
    try {
      // Opción 1: Service Account (recomendado para producción)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        const auth = new google.auth.GoogleAuth({
          credentials: serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        this.drive = google.drive({ version: 'v3', auth });
        return;
      }

      // Opción 2: Archivo de credenciales
      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
        path.join(__dirname, '../../../config/google-credentials.json');
      
      if (fs.existsSync(credentialsPath)) {
        const auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        this.drive = google.drive({ version: 'v3', auth });
        return;
      }

      console.warn('⚠️ Google Drive no configurado. Los certificados se guardarán localmente.');
    } catch (error) {
      console.error('❌ Error inicializando Google Drive:', error.message);
      this.drive = null;
    }
  }

  /**
   * Verifica si Google Drive está disponible
   */
  isAvailable() {
    return this.drive !== null;
  }

  /**
   * Sube un archivo PDF a Google Drive
   * @param {Buffer} pdfBuffer - Buffer del PDF
   * @param {string} fileName - Nombre del archivo
   * @param {string} certificateNumber - Número del certificado
   * @returns {Promise<string>} - ID del archivo en Google Drive
   */
  async uploadFile(pdfBuffer, fileName, certificateNumber) {
    if (!this.isAvailable()) {
      throw new Error('Google Drive no está configurado');
    }

    try {
      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : [],
      };

      const media = {
        mimeType: 'application/pdf',
        body: pdfBuffer,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      return response.data.id;
    } catch (error) {
      console.error('❌ Error subiendo archivo a Google Drive:', error.message);
      throw error;
    }
  }

  /**
   * Descarga un archivo de Google Drive por su ID
   * @param {string} fileId - ID del archivo en Google Drive
   * @returns {Promise<Buffer>} - Buffer del PDF
   */
  async downloadFile(fileId) {
    if (!this.isAvailable()) {
      throw new Error('Google Drive no está configurado');
    }

    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const chunks = [];
      return new Promise((resolve, reject) => {
        response.data
          .on('data', (chunk) => chunks.push(chunk))
          .on('end', () => resolve(Buffer.concat(chunks)))
          .on('error', reject);
      });
    } catch (error) {
      console.error('❌ Error descargando archivo de Google Drive:', error.message);
      throw error;
    }
  }

  /**
   * Verifica si un archivo existe en Google Drive
   * @param {string} fileId - ID del archivo
   * @returns {Promise<boolean>} - True si existe
   */
  async fileExists(fileId) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.drive.files.get({ fileId });
      return true;
    } catch (error) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Elimina un archivo de Google Drive
   * @param {string} fileId - ID del archivo
   */
  async deleteFile(fileId) {
    if (!this.isAvailable()) {
      throw new Error('Google Drive no está configurado');
    }

    try {
      await this.drive.files.delete({ fileId });
    } catch (error) {
      console.error('❌ Error eliminando archivo de Google Drive:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene el enlace de visualización del archivo
   * @param {string} fileId - ID del archivo
   * @returns {Promise<string>} - URL de visualización
   */
  async getFileViewLink(fileId) {
    if (!this.isAvailable()) {
      throw new Error('Google Drive no está configurado');
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'webViewLink',
      });
      return response.data.webViewLink;
    } catch (error) {
      console.error('❌ Error obteniendo enlace de Google Drive:', error.message);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();

