# ✅ Configuración Correcta de VITE_API_URL

## 🔍 Verificación de las Rutas del Backend

Revisando el código del backend, las rutas están configuradas así:

```46:49:src/app.ts
// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/certificados', certificateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/firma', firmaRoutes);
```

Y el health check también está en `/api`:

```38:43:src/app.ts
// Health check - en /api/health como espera el frontend
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});
```

---

## ✅ RESPUESTA: Usa la Opción 1

**Todas las rutas del backend están bajo `/api`**, por lo tanto:

### Configuración Correcta en Vercel (Frontend):

**Name:** `VITE_API_URL`  
**Value:** `https://movilis-backend.vercel.app/api`

**⚠️ IMPORTANTE:** Incluye `/api` al final de la URL.

---

## 📋 Pasos en Vercel

### 1. Ve a tu proyecto del Frontend en Vercel

### 2. Settings → Environment Variables

### 3. Agrega o edita `VITE_API_URL`:

- **Name:** `VITE_API_URL`
- **Value:** `https://movilis-backend.vercel.app/api`
  - ⚠️ **Reemplaza `movilis-backend.vercel.app` con la URL real de tu backend**
  - ✅ **Asegúrate de incluir `/api` al final**
- **Environment:** Selecciona **Production**, **Preview**, y **Development**
- Click en **Save**

### 4. Redeploy del Frontend

1. Ve a **Deployments**
2. Click en los 3 puntos del último deployment
3. Click en **Redeploy**
4. Espera a que termine

---

## 🔍 Cómo Verificar

### 1. Prueba el Health Check del Backend

Abre en el navegador:
```
https://movilis-backend.vercel.app/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Si funciona, confirma que los endpoints están en `/api`.

### 2. Verifica en la Consola del Navegador

Después del redeploy, en la consola del navegador deberías ver:

```
🔌 [API Config] VITE_API_URL: https://movilis-backend.vercel.app/api
🔌 [API Config] BASE_URL final: https://movilis-backend.vercel.app/api
```

### 3. Prueba el Login

Al hacer login, deberías ver en la consola:

```
🚀 [API] POST https://movilis-backend.vercel.app/api/auth/login
```

---

## 📝 Ejemplo Completo

### Backend (Vercel):
```
URL: https://movilis-backend.vercel.app
Endpoints:
- https://movilis-backend.vercel.app/api/health
- https://movilis-backend.vercel.app/api/auth/login
- https://movilis-backend.vercel.app/api/certificados
```

### Frontend (Vercel):
```
VITE_API_URL: https://movilis-backend.vercel.app/api
```

### Resultado:
El frontend construirá las URLs así:
- `VITE_API_URL` + `/auth/login` = `https://movilis-backend.vercel.app/api/auth/login` ✅
- `VITE_API_URL` + `/certificados` = `https://movilis-backend.vercel.app/api/certificados` ✅

---

## ⚠️ Errores Comunes

### Error: "404 Not Found" al hacer login

**Causa:** `VITE_API_URL` no incluye `/api`

**Solución:** Cambia de:
```
❌ VITE_API_URL: https://movilis-backend.vercel.app
```

A:
```
✅ VITE_API_URL: https://movilis-backend.vercel.app/api
```

### Error: "CORS policy" después de configurar

**Causa:** `CORS_ORIGIN` en el backend no está configurada

**Solución:**
1. Ve al backend en Vercel
2. Settings → Environment Variables
3. Agrega `CORS_ORIGIN` con la URL de tu frontend
4. Redeploy del backend

---

## ✅ Checklist Final

- [ ] `VITE_API_URL` configurada con `/api` al final
- [ ] URL del backend es correcta (reemplaza con la tuya)
- [ ] Variables configuradas en Production, Preview y Development
- [ ] Redeploy del frontend después de cambiar
- [ ] `CORS_ORIGIN` configurada en el backend
- [ ] Health check funciona: `https://tu-backend.vercel.app/api/health`

---

## 🎯 Resumen

**Configuración correcta:**
```
VITE_API_URL = https://movilis-backend.vercel.app/api
```

**NO uses:**
```
❌ VITE_API_URL = https://movilis-backend.vercel.app (sin /api)
```

