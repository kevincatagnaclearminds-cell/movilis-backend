# 🚀 Guía de Despliegue en Vercel

## Backend + Frontend en Vercel

### 📋 Requisitos Previos

1. Cuenta en [Vercel](https://vercel.com)
2. Repositorio en GitHub (para ambos proyectos)
3. Variables de entorno preparadas

---

## 🔧 PASO 1: Desplegar Backend

### 1.1 Preparar el Backend

```bash
cd movilis-backend

# Asegúrate de tener todo en Git
git add .
git commit -m "Preparado para Vercel"
git push
```

### 1.2 Crear Proyecto en Vercel

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click en **"Add New"** → **"Project"**
3. Importa tu repositorio `movilis-backend`
4. Configuración:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (raíz)
   - **Build Command**: `npm run build` (ya configurado en vercel.json)
   - **Output Directory**: `dist` (aunque Vercel usará `api/`)
   - **Install Command**: `npm install`

### 1.3 Variables de Entorno en Vercel

En el dashboard de Vercel, ve a **Settings** → **Environment Variables** y agrega:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.nnkzwhavjrufjdpokanm.supabase.co:5432/postgres?sslmode=require
NODE_ENV=production
PORT=3000
JWT_SECRET=tu-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://tu-frontend.vercel.app
P12_PATH=./secrets/certificado.p12
P12_PASSWORD=tu-password-del-certificado
```

**⚠️ IMPORTANTE**: Para el archivo `.p12`:
- Opción 1: Sube el archivo a `secrets/certificado.p12` en tu repo (no recomendado por seguridad)
- Opción 2: Usa Vercel Blob Storage o convierte a base64 y guárdalo como variable de entorno

### 1.4 Desplegar

1. Click en **"Deploy"**
2. Espera a que termine el build
3. Copia la URL del backend (ej: `https://movilis-backend.vercel.app`)

---

## 🎨 PASO 2: Desplegar Frontend

### 2.1 Preparar el Frontend

```bash
cd ../movilis-certificado

# Crear archivo .env.production
echo "VITE_API_URL=https://tu-backend.vercel.app/api" > .env.production

git add .
git commit -m "Configurado para producción"
git push
```

### 2.2 Crear Proyecto en Vercel

1. En el dashboard de Vercel, click en **"Add New"** → **"Project"**
2. Importa tu repositorio `movilis-certificado`
3. Configuración:
   - **Framework Preset**: Vite (debería detectarlo automáticamente)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2.3 Variables de Entorno del Frontend

En **Settings** → **Environment Variables**:

```env
VITE_API_URL=https://tu-backend.vercel.app/api
```

**⚠️ IMPORTANTE**: Reemplaza `tu-backend.vercel.app` con la URL real de tu backend.

### 2.4 Desplegar

1. Click en **"Deploy"**
2. Espera a que termine el build
3. Tu frontend estará disponible en `https://tu-frontend.vercel.app`

---

## ✅ Verificación Post-Despliegue

### Backend
- [ ] Health check: `https://tu-backend.vercel.app/api/health`
- [ ] Debe responder: `{"status":"ok","timestamp":"..."}`

### Frontend
- [ ] Abre la URL del frontend
- [ ] Verifica que se conecta al backend
- [ ] Prueba login y creación de certificados

---

## 🔒 Seguridad

### ⚠️ Archivo P12 en Vercel

El archivo `.p12` es sensible. Opciones:

**Opción A: Vercel Blob Storage** (Recomendado)
```bash
# Instalar Vercel Blob
npm install @vercel/blob

# Subir el archivo y usar la URL
```

**Opción B: Base64 en Variable de Entorno**
```bash
# Convertir a base64
cat certificado.p12 | base64 > p12_base64.txt

# Agregar como variable de entorno P12_BASE64
# Luego decodificar en el código
```

**Opción C: Servicio de Almacenamiento Externo**
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

---

## 🐛 Solución de Problemas

### Error: "Cannot find module '@vercel/node'"
```bash
npm install @vercel/node --save-dev
```

### Error: "Prisma Client not generated"
```bash
# Asegúrate de que el build command incluya:
npx prisma generate
```

### Error: "Timeout"
- Aumenta `maxDuration` en `vercel.json` (máximo 60s en plan gratuito)

### Error: "CORS"
- Verifica que `CORS_ORIGIN` en backend apunte a la URL del frontend

---

## 📝 Notas Importantes

1. **Prisma en Vercel**: Se genera automáticamente durante el build
2. **Conexiones**: Vercel mantiene conexiones pool para mejor rendimiento
3. **Archivos estáticos**: Usa Vercel Blob o servicios externos
4. **Límites del plan gratuito**:
   - 100GB bandwidth/mes
   - 100 horas de ejecución/mes
   - Timeout máximo: 60 segundos

---

## 🔄 Actualizaciones

Cada vez que hagas `git push`:
- Vercel detecta los cambios automáticamente
- Re-despliega automáticamente
- Puedes ver el progreso en el dashboard

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard → Deployments → Logs
2. Verifica las variables de entorno
3. Asegúrate de que el build local funciona: `npm run build`

¡Listo! 🎉

