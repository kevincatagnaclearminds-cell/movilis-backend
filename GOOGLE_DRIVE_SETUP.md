# 🔧 Configuración de Google Drive para Certificados

## Descripción

El sistema almacena los certificados PDF en Google Drive para evitar regenerarlos cada vez. El flujo es:

1. **Verificar si existe en Google Drive**: Si el certificado tiene un `google_drive_file_id`, intenta descargarlo
2. **Si no existe**: Genera el PDF, lo sube a Google Drive y guarda el ID
3. **Reutilización**: Los certificados se descargan desde Google Drive en solicitudes posteriores

## Pasos para Configurar Google Drive

### 1. Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Drive API**

### 2. Crear una Service Account

1. Ve a **IAM & Admin** > **Service Accounts**
2. Clic en **Create Service Account**
3. Completa:
   - **Name**: `movilis-certificates`
   - **Description**: `Service account para almacenar certificados`
4. Clic en **Create and Continue**
5. Asigna el rol **Editor** (o mínimo permisos necesarios)
6. Clic en **Done**

### 3. Crear y Descargar la Key

1. En la lista de Service Accounts, encuentra la que acabas de crear
2. Clic en el email de la service account
3. Ve a la pestaña **Keys**
4. Clic en **Add Key** > **Create new key**
5. Selecciona **JSON**
6. Descarga el archivo JSON

### 4. Compartir Carpeta en Google Drive

1. Crea una carpeta en Google Drive (ej: "Certificados Movilis")
2. Haz clic derecho en la carpeta > **Compartir**
3. Agrega el email de la Service Account (se ve en el JSON descargado, campo `client_email`)
4. Dale permisos de **Editor**
5. Copia el **ID de la carpeta** de la URL:
   ```
   https://drive.google.com/drive/folders/ESTE_ES_EL_ID_DE_LA_CARPETA
   ```

### 5. Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Google Drive Configuration
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
GOOGLE_DRIVE_FOLDER_ID=TU_ID_DE_CARPETA_AQUI
```

**O** coloca el archivo JSON en `src/config/google-credentials.json` y usa:

```env
GOOGLE_CREDENTIALS_PATH=src/config/google-credentials.json
GOOGLE_DRIVE_FOLDER_ID=TU_ID_DE_CARPETA_AQUI
```

## Estructura de la Base de Datos

La tabla `certificates` debe tener el campo `google_drive_file_id`:

```sql
ALTER TABLE certificates 
ADD COLUMN google_drive_file_id VARCHAR(255) UNIQUE;
```

O ejecuta el script `create_certificates_table.sql` actualizado que ya incluye este campo.

## Flujo de Funcionamiento

### Primera vez (Generar y Guardar):
1. Usuario solicita descargar certificado
2. Sistema verifica si tiene `google_drive_file_id` → No existe
3. Genera el PDF con la plantilla
4. Sube el PDF a Google Drive
5. Guarda el `google_drive_file_id` en la base de datos
6. Retorna el PDF al usuario

### Solicitudes posteriores (Reutilizar):
1. Usuario solicita descargar certificado
2. Sistema verifica si tiene `google_drive_file_id` → Existe
3. Descarga el PDF desde Google Drive
4. Retorna el PDF al usuario (sin regenerar)

## Ventajas

✅ **No regenera certificados**: Una vez generado, se reutiliza  
✅ **Almacenamiento en la nube**: No ocupa espacio local  
✅ **Backup automático**: Google Drive mantiene versiones  
✅ **Acceso rápido**: Descarga directa desde Google Drive  
✅ **Escalable**: No depende del almacenamiento local del servidor

## Troubleshooting

### Error: "Google Drive no está configurado"
- Verifica que las variables de entorno estén configuradas
- Asegúrate de que el archivo JSON de credenciales existe

### Error: "Permission denied"
- Verifica que la Service Account tenga acceso a la carpeta
- Asegúrate de haber compartido la carpeta con el email de la Service Account

### Error: "File not found"
- El archivo puede haber sido eliminado manualmente de Google Drive
- El sistema regenerará el certificado automáticamente

