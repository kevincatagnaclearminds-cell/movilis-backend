# 📋 Instrucciones para Configurar Variables de Entorno en Vercel

## 🎯 Variables Requeridas (Mínimas)

Estas son las variables **OBLIGATORIAS** para que el backend funcione:

### 1. Base de Datos
```
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.nnkzwhavjrufjdpokanm.supabase.co:5432/postgres?sslmode=require
```
- Reemplaza `TU_PASSWORD` con tu password real de Supabase

### 2. Entorno
```
NODE_ENV=production
```

### 3. Autenticación JWT
```
JWT_SECRET=tu-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d
```
- **Genera un JWT_SECRET seguro:**
  ```bash
  openssl rand -base64 32
  ```

### 4. CORS
```
CORS_ORIGIN=https://tu-frontend.vercel.app
```
- Reemplaza con la URL real de tu frontend en Vercel

### 5. Certificado P12 (Firma Digital)
```
P12_BASE64=[TODO_EL_CONTENIDO_DE_p12_base64_only.txt]
P12_PASSWORD=tu-password-del-certificado
```
- **Para P12_BASE64:**
  1. Abre el archivo `p12_base64_only.txt` en tu proyecto
  2. Selecciona TODO (Ctrl+A)
  3. Copia TODO (Ctrl+C)
  4. Pega en Vercel (debe tener ~11,756 caracteres)
  5. **IMPORTANTE:** Debe estar en UNA SOLA LÍNEA, sin saltos de línea

---

## 📝 Cómo Agregar Variables en Vercel

1. Ve a tu proyecto en Vercel
2. Click en **Settings** → **Environment Variables**
3. Para cada variable:
   - Click en **"Add New"**
   - Ingresa el **Name** (ej: `DATABASE_URL`)
   - Ingresa el **Value** (ej: `postgresql://...`)
   - Selecciona los ambientes: ✅ Production, ✅ Preview, ✅ Development
   - Click en **"Save"**

---

## ✅ Checklist Completo

- [ ] `DATABASE_URL` configurada con tu password real
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` generado y configurado (usa openssl rand -base64 32)
- [ ] `JWT_EXPIRES_IN=7d`
- [ ] `CORS_ORIGIN` con la URL de tu frontend
- [ ] `P12_BASE64` con TODO el contenido de `p12_base64_only.txt` (11,756 caracteres)
- [ ] `P12_PASSWORD` con tu password del certificado

---

## 🔍 Verificar que Funciona

Después de configurar las variables, haz un nuevo deploy y verifica:

1. El build debe completarse sin errores
2. Prueba el endpoint de health: `https://tu-backend.vercel.app/api/health`
3. Debe responder: `{"status":"ok","database":"postgres"}`

---

## ⚠️ Problemas Comunes

### "DATABASE_URL no está definida"
- Verifica que la variable esté en Vercel
- Asegúrate de seleccionar los 3 ambientes (Production, Preview, Development)

### "P12_BASE64 parece estar vacío"
- Verifica que copiaste TODO el contenido (11,756 caracteres)
- Asegúrate de que NO tenga saltos de línea
- Debe estar en UNA SOLA LÍNEA

### "CORS error"
- Verifica que `CORS_ORIGIN` tenga la URL correcta de tu frontend
- Debe incluir `https://` y NO terminar en `/`

---

## 📄 Archivo de Referencia

Usa el archivo `vercel-env-variables.txt` como referencia para copiar las variables.

