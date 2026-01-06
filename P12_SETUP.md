# 🔐 Configuración del Certificado P12

## Opciones para configurar el certificado P12

Tienes **2 opciones** para configurar tu certificado P12:

---

## ✅ Opción 1: Base64 en .env (RECOMENDADO para Vercel)

### Ventajas:
- ✅ Funciona perfectamente en Vercel
- ✅ No necesitas subir archivos al repositorio
- ✅ Más seguro (no expones rutas de archivos)
- ✅ Fácil de configurar

### Pasos:

1. **Convertir tu archivo P12 a base64:**

```bash
# Opción A: Usar el script incluido
npm run convert-p12 secrets/certificado.p12

# Opción B: Usar Node.js directamente
node scripts/convert-p12-to-base64.js secrets/certificado.p12

# Opción C: Usar PowerShell (Windows)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("secrets\certificado.p12"))

# Opción D: Usar Bash/Linux/Mac
base64 -i secrets/certificado.p12
```

2. **Agregar al .env:**

```env
P12_BASE64=TU_STRING_BASE64_AQUI
P12_PASSWORD=tu-password-del-certificado
```

3. **Listo!** El código detectará automáticamente `P12_BASE64` y lo usará.

---

## ✅ Opción 2: Ruta al archivo (Para desarrollo local)

### Ventajas:
- ✅ Más fácil para desarrollo local
- ✅ No necesitas convertir nada

### Pasos:

1. **Coloca tu archivo P12 en una carpeta segura:**

```bash
# Crear carpeta secrets si no existe
mkdir -p secrets

# Copiar tu certificado
cp ruta/tu/certificado.p12 secrets/certificado.p12
```

2. **Agregar al .env:**

```env
P12_PATH=./secrets/certificado.p12
P12_PASSWORD=tu-password-del-certificado
```

3. **Asegúrate de que el archivo esté en .gitignore:**

```gitignore
secrets/
*.p12
```

---

## 🔄 Prioridad de carga

El código intenta cargar el certificado en este orden:

1. **P12_BASE64** (si está definido) ← **Usa este para Vercel**
2. **P12_PATH** (si está definido) ← **Usa este para desarrollo local**
3. Parámetros del método (fallback)

---

## 🚀 Para Vercel

**Usa la Opción 1 (Base64):**

1. Convierte tu archivo:
```bash
npm run convert-p12 secrets/certificado.p12
```

2. Copia el string base64 que aparece

3. En Vercel Dashboard → Settings → Environment Variables:
   - Agrega `P12_BASE64` = (pega el string base64)
   - Agrega `P12_PASSWORD` = (tu password)

4. **NO** agregues `P12_PATH` en Vercel (no funcionará)

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE:

- ❌ **NUNCA** subas tu archivo `.p12` a Git
- ❌ **NUNCA** compartas tu `P12_BASE64` públicamente
- ✅ Mantén tu `.env` en `.gitignore`
- ✅ Usa variables de entorno en producción (Vercel, Railway, etc.)
- ✅ No compartas tu password del certificado

---

## 🧪 Verificar que funciona

Después de configurar, prueba creando un certificado. Deberías ver en los logs:

```
🔏 [signPDF] Usando certificado desde P12_BASE64 (variables de entorno)
```

o

```
🔏 [signPDF] Usando certificado desde P12_PATH (variables de entorno)
```

---

## ❓ Problemas comunes

### "No se encontró certificado P12"
- Verifica que `P12_BASE64` o `P12_PATH` estén definidos
- Verifica que `P12_PASSWORD` esté definido
- Si usas `P12_PATH`, verifica que la ruta sea correcta

### "Error decodificando P12_BASE64"
- Verifica que el string base64 esté completo
- Asegúrate de que no tenga saltos de línea
- Vuelve a convertir el archivo

### "Archivo .p12 no encontrado"
- Verifica la ruta en `P12_PATH`
- Asegúrate de que el archivo existe
- Usa rutas relativas desde la raíz del proyecto

---

## 📝 Ejemplo completo de .env

```env
# Base de datos
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=tu-secret
JWT_EXPIRES_IN=7d

# Certificado P12 - OPCIÓN 1: Base64 (recomendado para Vercel)
P12_BASE64=TU_STRING_BASE64_AQUI_MUY_LARGO...
P12_PASSWORD=tu-password

# Certificado P12 - OPCIÓN 2: Ruta (para desarrollo local)
# P12_PATH=./secrets/certificado.p12
# P12_PASSWORD=tu-password

# CORS
CORS_ORIGIN=https://tu-frontend.vercel.app
```

**Nota:** Solo usa UNA de las dos opciones (Base64 O Path), no ambas.

---

¡Listo! 🎉

