# 🔍 Diagnóstico de Conexión

## Problemas Comunes y Soluciones

### 1. ❌ Backend no se conecta a Supabase

**Síntomas:**
- Error: `DATABASE_URL no está definida`
- Error: `Connection timeout`
- Error: `SSL connection required`

**Soluciones:**

#### A) Verificar variables de entorno localmente:
```bash
npm run test:connection
```

#### B) Verificar que `DATABASE_URL` esté correcta:
```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.nnkzwhavjrufjdpokanm.supabase.co:5432/postgres?sslmode=require
```

**⚠️ IMPORTANTE:** 
- Reemplaza `TU_PASSWORD` con tu password real de Supabase
- El password puede contener caracteres especiales que necesitan ser codificados en URL
- Si tu password tiene `@`, `#`, `%`, etc., debes codificarlos:
  - `@` → `%40`
  - `#` → `%23`
  - `%` → `%25`
  - `&` → `%26`

#### C) En Vercel:
1. Ve a **Settings → Environment Variables**
2. Verifica que `DATABASE_URL` esté configurada
3. Verifica que el **Environment** sea correcto (Production, Preview, Development)
4. Haz un nuevo deploy después de agregar/cambiar variables

---

### 2. ❌ Frontend no se conecta al Backend

**Síntomas:**
- Error: `CORS policy: No 'Access-Control-Allow-Origin' header`
- Error: `Network Error`
- Error: `Failed to fetch`

**Soluciones:**

#### A) Verificar URL del backend en frontend:
En tu frontend, verifica que `VITE_API_URL` apunte al backend correcto:
```env
VITE_API_URL=https://tu-backend.vercel.app
```

#### B) Verificar CORS en backend:
En Vercel, configura `CORS_ORIGIN` con la URL de tu frontend:
```env
CORS_ORIGIN=https://tu-frontend.vercel.app
```

**⚠️ IMPORTANTE:**
- Si tienes múltiples orígenes, sepáralos con comas: `https://app1.com,https://app2.com`
- Para desarrollo local, puedes usar: `http://localhost:5173,http://localhost:3000`
- Después de cambiar `CORS_ORIGIN`, haz un nuevo deploy del backend

#### C) Verificar que el backend esté funcionando:
```bash
curl https://tu-backend.vercel.app/api/health
```

Debería responder:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 3. ❌ Error de autenticación JWT

**Síntomas:**
- Error: `JWT_SECRET no está definida`
- Error: `Invalid token`
- Error: `Token expired`

**Soluciones:**

#### A) Verificar `JWT_SECRET`:
```bash
# Generar un nuevo JWT_SECRET seguro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### B) Configurar en Vercel:
```env
JWT_SECRET=tu-secret-generado-aqui
JWT_EXPIRES_IN=7d
```

**⚠️ IMPORTANTE:**
- El mismo `JWT_SECRET` debe usarse en backend y frontend (si el frontend también valida tokens)
- Nunca compartas tu `JWT_SECRET` públicamente

---

### 4. ❌ Error con certificado P12

**Síntomas:**
- Error: `P12_BASE64 no está definida`
- Error: `Too few bytes to read ASN.1 value`
- Error: `Invalid password`

**Soluciones:**

#### A) Verificar que `P12_BASE64` esté completo:
```bash
# El string base64 debe tener aproximadamente 11,756 caracteres
# Debe estar en UNA SOLA LÍNEA sin espacios ni saltos de línea
```

#### B) Verificar `P12_PASSWORD`:
```env
P12_BASE64=[TODO_EL_CONTENIDO_DE_p12_base64_only.txt]
P12_PASSWORD=tu-password-del-certificado
```

#### C) Probar localmente:
```bash
npm run convert-p12
# Luego copia TODO el contenido de p12_base64_only.txt
```

---

## 🔧 Script de Diagnóstico

Ejecuta este comando para verificar todas las conexiones:

```bash
npm run test:connection
```

Este script verificará:
- ✅ Variables de entorno configuradas
- ✅ Conexión a Supabase
- ✅ Configuración de JWT
- ✅ Configuración de P12

---

## 📋 Checklist de Despliegue

### Backend en Vercel:
- [ ] `DATABASE_URL` configurada con password real
- [ ] `JWT_SECRET` configurada
- [ ] `JWT_EXPIRES_IN` configurada
- [ ] `CORS_ORIGIN` configurada (puede ser `*` temporalmente)
- [ ] `P12_BASE64` configurada (completa, sin espacios)
- [ ] `P12_PASSWORD` configurada
- [ ] `NODE_ENV=production`
- [ ] Deploy exitoso
- [ ] `/api/health` responde correctamente

### Frontend en Vercel:
- [ ] `VITE_API_URL` configurada con URL del backend
- [ ] Deploy exitoso
- [ ] Puede hacer requests al backend

### Conexión entre Frontend y Backend:
- [ ] `CORS_ORIGIN` en backend apunta a URL del frontend
- [ ] `VITE_API_URL` en frontend apunta a URL del backend
- [ ] No hay errores de CORS en la consola del navegador
- [ ] Las peticiones llegan al backend correctamente

---

## 🆘 Si Nada Funciona

1. **Verifica los logs de Vercel:**
   - Ve a tu proyecto en Vercel
   - Click en **Deployments**
   - Click en el último deployment
   - Revisa los **Function Logs**

2. **Prueba localmente primero:**
   ```bash
   npm run dev
   # Luego prueba: http://localhost:3000/api/health
   ```

3. **Verifica que todas las variables estén en el ambiente correcto:**
   - En Vercel, cada variable puede estar configurada para:
     - Production
     - Preview
     - Development
   - Asegúrate de que estén en el ambiente que estás usando

4. **Revisa la configuración de Supabase:**
   - Ve a tu proyecto en Supabase
   - Settings → Database
   - Verifica que la conexión esté activa
   - Verifica que el password sea correcto

---

## 📞 Información Útil para Debugging

Si necesitas ayuda, proporciona:
1. El error exacto que ves
2. Los logs de Vercel (Function Logs)
3. El resultado de `npm run test:connection`
4. La configuración de tus variables de entorno (sin mostrar passwords reales)

