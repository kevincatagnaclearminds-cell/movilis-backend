# 🚨 Solución: Error de CORS

## ❌ El Error que Ves

```
Access to fetch at 'https://movilis-backend.vercel.app/api/health' 
from origin 'https://movilis-certificado-t187.vercel.app' 
has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Esto significa que el backend no está permitiendo que el frontend se conecte.**

---

## ✅ Solución: Configurar CORS_ORIGIN

El frontend está en: `https://movilis-certificado-t187.vercel.app`  
El backend está en: `https://movilis-backend.vercel.app`

**Necesitas configurar `CORS_ORIGIN` en el backend con la URL del frontend.**

---

## 📋 Pasos en Vercel (Backend)

### Paso 1: Ve a tu proyecto del Backend en Vercel

### Paso 2: Settings → Environment Variables

### Paso 3: Agrega o edita `CORS_ORIGIN`:

- **Name:** `CORS_ORIGIN`
- **Value:** `https://movilis-certificado-t187.vercel.app`
  - ⚠️ **Esta es la URL de tu frontend (la que aparece en el error)**
- **Environment:** Selecciona **Production**, **Preview**, y **Development**
- Click en **Save**

### Paso 4: Redeploy del Backend

**MUY IMPORTANTE:** Después de agregar/cambiar `CORS_ORIGIN`, debes hacer un redeploy:

1. Ve a **Deployments**
2. Click en los 3 puntos del último deployment
3. Click en **Redeploy**
4. Espera a que termine (puede tardar 1-2 minutos)

---

## 🔍 Verificar que Funciona

### 1. Espera a que termine el redeploy del backend

### 2. Recarga la página del frontend

### 3. En la consola del navegador deberías ver:

```
✅ [API] Backend disponible
✅ [Movilis] Conectado al backend
```

**En lugar de:**
```
❌ ⚠️ [API] Backend no disponible, usando modo demo
```

### 4. Prueba hacer login

Debería funcionar sin errores de CORS.

---

## 📝 Configuración Completa

### Backend (Vercel):
```
CORS_ORIGIN: https://movilis-certificado-t187.vercel.app
```

### Frontend (Vercel):
```
VITE_API_URL: https://movilis-backend.vercel.app/api
```

---

## ⚠️ Si Tienes Múltiples Orígenes

Si quieres permitir tanto el frontend en Vercel como desarrollo local:

```
CORS_ORIGIN: https://movilis-certificado-t187.vercel.app,http://localhost:5173
```

O si quieres permitir todos (solo para desarrollo):

```
CORS_ORIGIN: *
```

---

## 🚨 Errores Comunes

### Error: "CORS policy" después de configurar

**Causa:** No hiciste redeploy del backend después de cambiar `CORS_ORIGIN`

**Solución:**
1. Ve a Deployments
2. Haz un redeploy del backend
3. Espera a que termine
4. Recarga el frontend

### Error: "CORS policy" con URL diferente

**Causa:** La URL del frontend cambió o hay múltiples deployments

**Solución:**
- Verifica la URL exacta del frontend en el error de CORS
- Usa esa URL exacta en `CORS_ORIGIN`
- Si tienes múltiples deployments, agrega todas las URLs separadas por comas

---

## ✅ Checklist

- [ ] `CORS_ORIGIN` configurada con la URL exacta del frontend
- [ ] URL del frontend: `https://movilis-certificado-t187.vercel.app`
- [ ] Variables configuradas en Production, Preview y Development
- [ ] **Redeploy del backend después de cambiar `CORS_ORIGIN`** ⚠️ MUY IMPORTANTE
- [ ] Recarga el frontend después del redeploy
- [ ] Verifica que no haya más errores de CORS

---

## 💡 Resumen

1. **Ve al backend en Vercel**
2. **Settings → Environment Variables**
3. **Agrega:** `CORS_ORIGIN = https://movilis-certificado-t187.vercel.app`
4. **Redeploy del backend** ⚠️
5. **Recarga el frontend**
6. **¡Listo!** ✅

---

## 🎯 URL Exacta que Necesitas

Según el error, tu frontend está en:
```
https://movilis-certificado-t187.vercel.app
```

Entonces en el backend configura:
```
CORS_ORIGIN = https://movilis-certificado-t187.vercel.app
```

