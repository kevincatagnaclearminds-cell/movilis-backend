# 🔌 Solución: Frontend No Se Conecta al Backend

## ❌ El Error que Ves

```
🔌 [Movilis] Conectando al backend: http://localhost:3000/api
⚠️ [API] Backend no disponible, usando modo demo
ERR_CONNECTION_REFUSED
```

**Esto significa que el frontend está intentando conectarse a `localhost:3000`, pero:**
- El backend no está corriendo localmente, O
- El frontend está desplegado en Vercel y debería conectarse a la URL de Vercel

---

## 🔍 Diagnóstico

### ¿Dónde está tu frontend?

#### Opción A: Frontend en Vercel (Producción)
Si tu frontend está desplegado en Vercel, **NO puede conectarse a `localhost:3000`** porque:
- `localhost` solo funciona en tu computadora
- En Vercel, `localhost` no existe

**Solución:** Configura `VITE_API_URL` con la URL de tu backend en Vercel.

#### Opción B: Frontend Local (Desarrollo)
Si estás probando el frontend localmente, el backend debe estar corriendo en tu computadora.

**Solución:** Inicia el backend localmente.

---

## 🛠️ Solución Según tu Caso

### Caso 1: Frontend en Vercel + Backend en Vercel

**El frontend necesita conectarse a la URL de Vercel del backend, no a localhost.**

#### Paso 1: Obtén la URL del Backend en Vercel

1. Ve a tu proyecto del **backend** en Vercel
2. Ve a **Settings** → **Domains**
3. Copia la URL (ej: `https://movilis-backend.vercel.app`)

#### Paso 2: Configura en el Frontend (Vercel)

1. Ve a tu proyecto del **frontend** en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Agrega o edita:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://movilis-backend.vercel.app` (tu URL del backend)
   - Selecciona: **Production**, **Preview**, **Development**
   - Click en **Save**

#### Paso 3: Redeploy del Frontend

1. Ve a **Deployments**
2. Click en los 3 puntos del último deployment
3. Click en **Redeploy**
4. Espera a que termine

#### Paso 4: Verifica CORS en el Backend

1. Ve a tu proyecto del **backend** en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Verifica que tengas:
   - **Name:** `CORS_ORIGIN`
   - **Value:** `https://tu-frontend.vercel.app` (URL de tu frontend)
4. Si no está, agrégalo y haz un redeploy del backend

---

### Caso 2: Frontend Local + Backend Local

**Ambos deben estar corriendo en tu computadora.**

#### Paso 1: Inicia el Backend

```bash
cd movilis-backend
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en puerto 3000
```

#### Paso 2: Verifica el Frontend

En tu frontend, verifica que `VITE_API_URL` esté configurada en `.env`:

```env
VITE_API_URL=http://localhost:3000
```

#### Paso 3: Inicia el Frontend

```bash
cd movilis-frontend
npm run dev
```

---

### Caso 3: Frontend Local + Backend en Vercel

**El frontend local puede conectarse al backend en Vercel.**

#### Paso 1: Configura el Frontend Local

En el archivo `.env` del frontend:

```env
VITE_API_URL=https://movilis-backend.vercel.app
```

#### Paso 2: Configura CORS en el Backend

En Vercel (backend), agrega:

```env
CORS_ORIGIN=http://localhost:5173
```

O si tu frontend usa otro puerto:

```env
CORS_ORIGIN=http://localhost:3000
```

O para permitir ambos (local y producción):

```env
CORS_ORIGIN=http://localhost:5173,https://tu-frontend.vercel.app
```

#### Paso 3: Redeploy del Backend

Después de cambiar `CORS_ORIGIN`, haz un redeploy del backend.

---

## 📋 Checklist Rápido

### Si el Frontend está en Vercel:
- [ ] `VITE_API_URL` configurada con la URL de Vercel del backend (no localhost)
- [ ] `CORS_ORIGIN` en el backend configurada con la URL del frontend
- [ ] Redeploy del frontend después de cambiar `VITE_API_URL`
- [ ] Redeploy del backend después de cambiar `CORS_ORIGIN`

### Si el Frontend está Local:
- [ ] Backend corriendo localmente (`npm run dev`)
- [ ] `VITE_API_URL=http://localhost:3000` en `.env` del frontend
- [ ] Frontend corriendo (`npm run dev`)

---

## 🔍 Verificar la Configuración

### En el Frontend (Vercel):
1. Ve a **Settings** → **Environment Variables**
2. Busca `VITE_API_URL`
3. Verifica que tenga la URL de Vercel del backend (no localhost)

### En el Backend (Vercel):
1. Ve a **Settings** → **Environment Variables**
2. Busca `CORS_ORIGIN`
3. Verifica que tenga la URL de Vercel del frontend

---

## 🚨 Errores Comunes

### Error: "ERR_CONNECTION_REFUSED" con localhost

**Causa:** El frontend está intentando conectarse a `localhost:3000`, pero:
- El backend no está corriendo localmente, O
- El frontend está en Vercel y no puede acceder a localhost

**Solución:**
- Si el frontend está en Vercel: Cambia `VITE_API_URL` a la URL de Vercel
- Si el frontend está local: Inicia el backend localmente

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Causa:** `CORS_ORIGIN` no está configurada o tiene la URL incorrecta

**Solución:**
- Configura `CORS_ORIGIN` en el backend con la URL exacta del frontend
- Haz un redeploy del backend

---

## 💡 Resumen

**El problema es que el frontend está configurado para conectarse a `localhost:3000`, pero:**

1. **Si el frontend está en Vercel:** Debe conectarse a la URL de Vercel del backend
2. **Si el frontend está local:** El backend debe estar corriendo localmente

**Solución más común:**
- Frontend en Vercel → Configura `VITE_API_URL` con la URL de Vercel del backend
- Backend en Vercel → Configura `CORS_ORIGIN` con la URL de Vercel del frontend

