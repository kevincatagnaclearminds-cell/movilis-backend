# 🚂 Guía de Despliegue en Railway

Esta guía te ayudará a desplegar el backend de Movilis en Railway.

## 📋 Requisitos Previos

1. Cuenta en [Railway](https://railway.app)
2. Repositorio en GitHub (o GitLab/Bitbucket)
3. Base de datos en Supabase configurada

## 🚀 Pasos para Desplegar

### 1. Preparar el Repositorio

Asegúrate de que tu código esté en un repositorio Git:

```bash
git add .
git commit -m "Preparar para despliegue en Railway"
git push origin main
```

### 2. Crear Proyecto en Railway

1. Ve a [Railway](https://railway.app) e inicia sesión
2. Haz clic en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Conecta tu cuenta de GitHub si es necesario
5. Selecciona el repositorio `movilis-backend`
6. Railway detectará automáticamente que es un proyecto Node.js

### 3. Configurar Variables de Entorno

En Railway, ve a tu proyecto → **Variables** y agrega:

#### Variables Obligatorias

```env
# Base de datos
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres?sslmode=require

# JWT
JWT_SECRET=tu-secreto-jwt-super-seguro-aqui
JWT_EXPIRES_IN=7d

# CORS (URL del frontend en Vercel)
CORS_ORIGIN=https://movilis-certificado-t187.vercel.app

# P12 para firma digital (opcional, si usas firma)
P12_BASE64=tu-certificado-en-base64
P12_PASSWORD=tu-password-del-certificado

# Entorno
NODE_ENV=production
PORT=3000
```

#### Cómo obtener DATABASE_URL de Supabase

**⚠️ IMPORTANTE: Railway requiere IPv4, por lo que DEBES usar Connection Pooling**

1. Ve a tu proyecto en Supabase
2. Settings → Database
3. Connection string → **Connection pooling** (NO uses "Direct connection")
4. Selecciona **"Session mode"** (recomendado para Prisma)
5. Copia la URL que aparecerá (será diferente, con `pooler.supabase.com` y puerto `6543`)
6. Reemplaza `[YOUR-PASSWORD]` con tu password real
7. Asegúrate de que termine con `/postgres?sslmode=require`

**Ejemplo de URL de Connection Pooling:**
```
postgresql://postgres.xxx:TU_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**Nota:** Si ves la advertencia "Not IPv4 compatible" en Supabase, significa que debes usar el Pooler. Railway no soporta IPv6.

### 4. Configurar Build y Start Commands

Railway detectará automáticamente:
- **Build Command**: `npm run build`
- **Start Command**: `npm start` (desde el Procfile)

Si necesitas configurarlo manualmente:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 5. Configurar Puerto

Railway asigna automáticamente el puerto a través de la variable `PORT`. El código ya está configurado para usar `process.env.PORT || 3000`.

### 6. Desplegar

1. Railway comenzará a construir tu proyecto automáticamente
2. Puedes ver el progreso en la pestaña **Deployments**
3. Una vez completado, verás la URL de tu backend (ej: `https://movilis-backend-production.up.railway.app`)

### 7. Verificar el Despliegue

1. Ve a la pestaña **Deployments**
2. Haz clic en el deployment más reciente
3. Revisa los logs para asegurarte de que no hay errores
4. Prueba el endpoint de health: `https://tu-url.railway.app/api/health`

### 8. Configurar Dominio Personalizado (Opcional)

1. Ve a **Settings** → **Domains**
2. Haz clic en **Generate Domain** o agrega tu dominio personalizado
3. Railway te dará una URL como: `movilis-backend-production.up.railway.app`

### 9. Actualizar Frontend

Actualiza la variable de entorno en Vercel (frontend):

1. Ve a tu proyecto frontend en Vercel
2. Settings → Environment Variables
3. Actualiza `VITE_API_URL` con la URL de Railway:
   ```
   VITE_API_URL=https://movilis-backend-production.up.railway.app/api
   ```
4. Haz un redeploy del frontend

## 🔧 Solución de Problemas

### Error: "Cannot find module '@prisma/client'"

**Solución**: Asegúrate de que el build command incluya `npx prisma generate`:
```bash
npm install && npx prisma generate && npm exec -- tsc
```

### Error: "Can't reach database server"

**Solución**: 
1. Verifica que `DATABASE_URL` esté correctamente configurada
2. Asegúrate de que termine con `/postgres?sslmode=require`
3. Verifica que el password no tenga comillas
4. Revisa que Supabase permita conexiones desde Railway

### Error: "Port already in use"

**Solución**: Railway asigna el puerto automáticamente. Asegúrate de usar `process.env.PORT` en tu código (ya está configurado).

### CORS Error

**Solución**: 
1. Verifica que `CORS_ORIGIN` esté configurada con la URL del frontend
2. O usa `*` para permitir todos los orígenes (menos seguro)

## 📊 Monitoreo

Railway proporciona:
- **Logs en tiempo real**: Ve a la pestaña **Deployments** → selecciona un deployment → **View Logs**
- **Métricas**: CPU, Memoria, Red
- **Alertas**: Configura alertas en **Settings** → **Notifications**

## 🔄 Actualizaciones Futuras

Cada vez que hagas push a la rama `main` (o la rama configurada), Railway desplegará automáticamente los cambios.

## 📝 Notas Importantes

1. **Railway no es serverless**: A diferencia de Vercel, Railway ejecuta un servidor Node.js tradicional que está siempre activo.

2. **Conexiones de base de datos**: Railway puede mantener conexiones persistentes, por lo que el pool de conexiones está configurado para 10 conexiones (vs 1 en Vercel).

3. **Variables de entorno**: Todas las variables sensibles deben estar en Railway, nunca en el código.

4. **Logs**: Los logs están disponibles en tiempo real en la interfaz de Railway.

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Asegúrate de que el build se complete correctamente
4. Revisa la documentación de Railway: https://docs.railway.app

