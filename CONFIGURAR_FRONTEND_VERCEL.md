# 🔧 Configurar Frontend para Vercel

## ✅ Ya Hiciste el Backend

Ahora necesitas configurar el **frontend** para que se conecte al backend en Vercel.

---

## 📋 Paso a Paso

### Paso 1: Obtén la URL del Backend en Vercel

1. Ve a tu proyecto del **backend** en Vercel
2. Click en **Settings** → **Domains**
3. Copia la URL que aparece (ej: `movilis-backend.vercel.app`)
4. Agrega `https://` al inicio: `https://movilis-backend.vercel.app`

---

### Paso 2: Configura en el Frontend (Vercel)

**Si tu frontend está desplegado en Vercel:**

1. Ve a tu proyecto del **frontend** en Vercel
2. Click en **Settings** → **Environment Variables**
3. Busca `VITE_API_URL` o agrega una nueva:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://movilis-backend.vercel.app` (la URL de tu backend)
   - **IMPORTANTE:** Selecciona los ambientes: **Production**, **Preview**, **Development**
   - Click en **Save**

4. **Redeploy del frontend:**
   - Ve a **Deployments**
   - Click en los 3 puntos del último deployment
   - Click en **Redeploy**
   - Espera a que termine

---

### Paso 3: Si el Frontend está Local (Desarrollo)

**Si estás probando el frontend localmente:**

1. Abre el archivo `.env` en la raíz del proyecto del frontend
2. Agrega o edita:
   ```env
   VITE_API_URL=https://movilis-backend.vercel.app
   ```
   (Reemplaza con la URL real de tu backend)

3. **Reinicia el servidor del frontend:**
   ```bash
   # Detén el servidor (Ctrl+C)
   # Luego inícialo de nuevo
   npm run dev
   ```

---

## 🔍 Verificar la Configuración

### En Vercel (Frontend):
1. Ve a **Settings** → **Environment Variables**
2. Busca `VITE_API_URL`
3. Debe tener: `https://movilis-backend.vercel.app` (NO `http://localhost:3000`)

### En Vercel (Backend):
1. Ve a **Settings** → **Environment Variables**
2. Busca `CORS_ORIGIN`
3. Debe tener: `https://tu-frontend.vercel.app` (la URL de tu frontend)

---

## ⚠️ Errores Comunes

### Error: "ERR_CONNECTION_REFUSED" con localhost

**Causa:** El frontend todavía está configurado para usar `localhost:3000`

**Solución:**
- Si el frontend está en Vercel: Cambia `VITE_API_URL` a la URL de Vercel del backend
- Si el frontend está local: Cambia `VITE_API_URL` en `.env` a la URL de Vercel del backend

### Error: "CORS policy" después de cambiar

**Causa:** `CORS_ORIGIN` en el backend no tiene la URL del frontend

**Solución:**
- Agrega `CORS_ORIGIN` en el backend con la URL del frontend
- Haz un redeploy del backend

---

## 📝 Resumen

1. **Backend en Vercel:** ✅ Ya está configurado
2. **Frontend en Vercel:** 
   - Configura `VITE_API_URL` con la URL del backend
   - Redeploy
3. **Backend CORS:**
   - Configura `CORS_ORIGIN` con la URL del frontend
   - Redeploy

---

## ✅ Checklist Final

- [ ] `VITE_API_URL` en frontend apunta a la URL de Vercel del backend (no localhost)
- [ ] `CORS_ORIGIN` en backend apunta a la URL de Vercel del frontend
- [ ] Redeploy del frontend después de cambiar `VITE_API_URL`
- [ ] Redeploy del backend después de cambiar `CORS_ORIGIN`
- [ ] Prueba que el frontend se conecte al backend

---

## 🎯 Ejemplo Completo

### Backend (Vercel):
```
URL: https://movilis-backend.vercel.app
CORS_ORIGIN: https://movilis-frontend.vercel.app
```

### Frontend (Vercel):
```
URL: https://movilis-frontend.vercel.app
VITE_API_URL: https://movilis-backend.vercel.app
```

### Frontend (Local - Desarrollo):
```
VITE_API_URL: https://movilis-backend.vercel.app
```

---

## 💡 Tip

**Si quieres probar localmente pero conectarte al backend en Vercel:**

En el frontend `.env`:
```env
VITE_API_URL=https://movilis-backend.vercel.app
```

Y en el backend (Vercel), configura `CORS_ORIGIN` para permitir ambos:
```env
CORS_ORIGIN=http://localhost:5173,https://movilis-frontend.vercel.app
```

