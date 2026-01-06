# 🚀 Pasos Finales para Desplegar en Vercel

## ✅ Lo que ya está listo:
- ✅ Backend configurado para Vercel
- ✅ P12_BASE64 configurado en .env
- ✅ Código corregido y funcionando
- ✅ Conexión a Supabase verificada

---

## 📋 PASO 1: Preparar el Backend para Git

### 1.1 Verificar que .env NO se suba a Git
Tu `.gitignore` ya está configurado correctamente ✅

### 1.2 Subir el backend a GitHub

```bash
# Si aún no tienes Git inicializado
git init
git add .
git commit -m "Backend listo para Vercel"
git branch -M main
git remote add origin [URL-de-tu-repo-github]
git push -u origin main
```

**⚠️ IMPORTANTE**: Asegúrate de que `.env` NO esté en Git (debe estar en `.gitignore`)

---

## 📋 PASO 2: Desplegar Backend en Vercel

### 2.1 Crear proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Click en **"Add New"** → **"Project"**
3. Conecta tu repositorio de GitHub (`movilis-backend`)
4. Configuración:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (raíz)
   - **Build Command**: `npm run build` (ya configurado en vercel.json)
   - **Output Directory**: `dist` (aunque Vercel usará `api/`)
   - **Install Command**: `npm install`

### 2.2 Variables de Entorno en Vercel

En el dashboard de Vercel, ve a **Settings** → **Environment Variables** y agrega:

```env
DATABASE_URL=postgresql://postgres:7W*j.E2ja7ASctM@db.nnkzwhavjrufjdpokanm.supabase.co:5432/postgres?sslmode=require
NODE_ENV=production
PORT=3000
JWT_SECRET=tu-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://tu-frontend.vercel.app
P12_BASE64=[PEGA_AQUI_EL_STRING_COMPLETO_DEL_ARCHIVO_p12_base64_only.txt]
P12_PASSWORD=tu-password-del-certificado
```

**💡 Para obtener P12_BASE64:**
- Abre el archivo `p12_base64_only.txt` en tu proyecto
- Copia TODO el contenido (11,756 caracteres)
- Pégalo en la variable `P12_BASE64` en Vercel

### 2.3 Desplegar

1. Click en **"Deploy"**
2. Espera a que termine el build (puede tardar 2-5 minutos)
3. Copia la URL del backend (ej: `https://movilis-backend.vercel.app`)

---

## 📋 PASO 3: Desplegar Frontend en Vercel

### 3.1 Preparar el Frontend

```bash
cd ../movilis-certificado

# Crear archivo .env.production
echo "VITE_API_URL=https://tu-backend.vercel.app/api" > .env.production

# Subir a GitHub
git add .
git commit -m "Frontend listo para producción"
git push
```

**⚠️ IMPORTANTE**: Reemplaza `tu-backend.vercel.app` con la URL REAL de tu backend de Vercel

### 3.2 Crear proyecto Frontend en Vercel

1. En el dashboard de Vercel, click en **"Add New"** → **"Project"**
2. Conecta tu repositorio `movilis-certificado`
3. Configuración:
   - **Framework Preset**: Vite (debería detectarlo automáticamente)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3.3 Variables de Entorno del Frontend

En **Settings** → **Environment Variables**:

```env
VITE_API_URL=https://tu-backend.vercel.app/api
```

**⚠️ IMPORTANTE**: Reemplaza con la URL real de tu backend

### 3.4 Desplegar

1. Click en **"Deploy"**
2. Espera a que termine el build
3. Tu frontend estará en `https://tu-frontend.vercel.app`

---

## ✅ Verificación Post-Despliegue

### Backend
- [ ] Health check: `https://tu-backend.vercel.app/api/health`
- [ ] Debe responder: `{"status":"ok","timestamp":"..."}`

### Frontend
- [ ] Abre la URL del frontend
- [ ] Verifica que se conecta al backend
- [ ] Prueba login
- [ ] Prueba crear certificado (como admin)

---

## 🔄 Actualizar CORS después del despliegue

Una vez que tengas la URL del frontend, actualiza `CORS_ORIGIN` en Vercel:

1. Ve a tu proyecto backend en Vercel
2. **Settings** → **Environment Variables**
3. Edita `CORS_ORIGIN` y pon la URL de tu frontend:
   ```
   CORS_ORIGIN=https://tu-frontend.vercel.app
   ```
4. Vercel redeployará automáticamente

---

## 🎯 Resumen Rápido

1. ✅ Backend → GitHub → Vercel
2. ✅ Agregar variables de entorno en Vercel (incluyendo P12_BASE64 completo)
3. ✅ Frontend → GitHub → Vercel
4. ✅ Agregar VITE_API_URL apuntando al backend
5. ✅ Actualizar CORS_ORIGIN con la URL del frontend
6. ✅ ¡Listo! 🎉

---

## 📝 Checklist Final

- [ ] Backend subido a GitHub
- [ ] Backend desplegado en Vercel
- [ ] Todas las variables de entorno configuradas
- [ ] P12_BASE64 completo (11,756 caracteres)
- [ ] Frontend subido a GitHub
- [ ] Frontend desplegado en Vercel
- [ ] VITE_API_URL apunta al backend correcto
- [ ] CORS_ORIGIN actualizado con URL del frontend
- [ ] Health check del backend funciona
- [ ] Frontend se conecta al backend

---

¡Éxito con el despliegue! 🚀

