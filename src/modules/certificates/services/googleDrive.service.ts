import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

class GoogleDriveService {
  private drive: ReturnType<typeof google.drive> | null;
  private folderId: string | null;

  constructor() {
    // Inicializar cliente de Google Drive
    this.drive = null;
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
    this.initializeDrive();
  }

  /**
   * Inicializa el cliente de Google Drive usando Service Account
   */
  private initializeDrive(): void {
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
      const err = error as Error;
      console.error('❌ Error inicializando Google Drive:', err.message);
      this.drive = null;
    }
  }

  /**
   * Verifica si Google Drive está disponible
   */
  isAvailable(): boolean {
    return this.drive !== null;
  }

  /**
   * Sube un archivo PDF a Google Drive
   */
  async uploadFile(pdfBuffer: Buffer, fileName: string, certificateNumber: string): Promise<string> {
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

      const response = await this.drive!.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      return response.data.id as string;
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error subiendo archivo a Google Drive:', err.message);
      throw error;
    }
  }

  /**
   * Descarga un archivo de Google Drive por su ID
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    if (!this.isAvailable()) {
      throw new Error('Google Drive no está configurado');
    }

    try {
      const response = await this.drive!.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        (response.data as Readable)
          .on('data', (chunk: Buffer) => chunks.push(chunk))
          .on('end', () => resolve(Buffer.concat(chunks)))
          .on('error', reject);
      });
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error descargando archivo de Google Drive:', err.message);
      throw error;
    }
  }

  /**
   * Verifica si un archivo existe en Google Drive
   */
  async fileExists(fileId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.drive!.files.get({ fileId });
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Elimina un archivo de Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Google Drive no está configurado');
    }

    try {
      await this.drive!.files.delete({ fileId });
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error eliminando archivo de Google Drive:', err.message);
      throw error;
    }
  }

  /**
   * Obtiene el enlace de visualización del archivo
   */
  async getFileViewLink(fileId: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Google Drive no está configurado');
    }

    try {
      const response = await this.drive!.files.get({
        fileId,
        fields: 'webViewLink',
      });
      return response.data.webViewLink as string;
    } catch (error) {
      const err = error as Error;
      console.error('❌ Error obteniendo enlace de Google Drive:', err.message);
      throw error;
    }
  }
}

export default new GoogleDriveService();


