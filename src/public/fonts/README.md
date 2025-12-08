# Directorio de Fuentes para PDFs

Este directorio contiene las fuentes personalizadas que se usan para generar los certificados en PDF.

## Cómo agregar una nueva fuente

1. **Coloca el archivo de fuente** en este directorio (`src/public/fonts/`)
   - Formatos soportados: `.ttf`, `.otf`
   - Ejemplo: `MiFuente.ttf`

2. **Actualiza el código** en `src/modules/certificates/services/pdf.service.js`:
   
   En el constructor de la clase `PDFService`, agrega la nueva fuente al objeto `this.fonts`:
   
   ```javascript
   this.fonts = {
     alexBrush: path.join(this.fontsDir, 'AlexBrush-Regular.ttf'),
     miFuente: path.join(this.fontsDir, 'MiFuente.ttf'),  // ← Agrega esta línea
   };
   ```

3. **Opcional: Cambiar la fuente por defecto**
   
   Si quieres que tu nueva fuente sea la predeterminada, cambia:
   ```javascript
   this.defaultFont = 'miFuente';  // Cambia 'alexBrush' por 'miFuente'
   ```

4. **Usar una fuente específica al generar un certificado**
   
   Cuando generes un certificado, puedes especificar qué fuente usar:
   ```javascript
   const certificateData = {
     recipientName: 'Juan Pérez',
     courseName: 'Curso de Programación',
     fontName: 'miFuente'  // ← Especifica la fuente aquí
   };
   ```

## Fuentes actuales

- **alexBrush**: `AlexBrush-Regular.ttf` (fuente por defecto)

## Notas

- Si la fuente especificada no existe, se usará la fuente por defecto
- Si ninguna fuente personalizada está disponible, se usará Helvetica (fuente estándar)
- Asegúrate de que los archivos de fuente tengan permisos de lectura

