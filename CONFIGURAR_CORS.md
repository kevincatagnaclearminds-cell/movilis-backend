# 🔧 Cómo Configurar CORS_ORIGIN

## 📍 Dónde se Usa

El código ya está configurado para leer `CORS_ORIGIN` de las variables de entorno:

```23:26:src/app.ts
// CORS
app.use(cors({
  origin: config.corsOrigin || '*',
  credentials: true
}));
```

```9:9:src/config/config.ts
  corsOrigin: process.env.CORS_ORIGIN || '*'
```

---

## 🖥️ 1. Configuración Local (Desarrollo)

### Paso 1: Abre tu archivo `.env`

En la raíz del proyecto, agrega o edita:

```env
CORS_ORIGIN=http://localhost:5173
```

**O si tu frontend usa otro puerto:**
```env
CORS_ORIGIN=http://localhost:3000
```

**O para permitir cualquier origen (solo desarrollo):**
```env
CORS_ORIGIN=*
```

### Paso 2: Reinicia el servidor

```bash
npm run dev
```

---

## ☁️ 2. Configuración en Vercel (Producción)

### Opción A: Si ya tienes el frontend desplegado

1. **Obtén la URL de tu frontend:**
   - Ve a tu proyecto del frontend en Vercel
   - Copia la URL (ej: `https://movilis-frontend.vercel.app`)

2. **Configura en el backend (Vercel):**
   - Ve a tu proyecto del **backend** en Vercel
   - Click en **Settings** → **Environment Variables**
   - Click en **Add New**
   - **Name:** `CORS_ORIGIN`
   - **Value:** `https://movilis-frontend.vercel.app`
   - Selecciona los ambientes: **Production**, **Preview**, **Development**
   - Click en **Save**

3. **Haz un redeploy:**
   - Ve a **Deployments**
   - Click en los 3 puntos del último deployment
   - Click en **Redeploy**

### Opción B: Si aún no tienes el frontend desplegado

1. **Temporalmente, permite todos los orígenes:**
   - En Vercel (backend), agrega:
     - **Name:** `CORS_ORIGIN`
     - **Value:** `*`
   - Esto permitirá que cualquier frontend se conecte (solo para pruebas)

2. **Después de desplegar el frontend:**
   - Obtén la URL del frontend
   - Actualiza `CORS_ORIGIN` con la URL real
   - Haz un redeploy

---

## 📋 Ejemplos de Valores

### Un solo origen:
```env
CORS_ORIGIN=https://movilis-frontend.vercel.app
```

### Múltiples orígenes (separados por comas):
```env
CORS_ORIGIN=https://movilis-frontend.vercel.app,https://movilis-admin.vercel.app
```

### Desarrollo local:
```env
CORS_ORIGIN=http://localhost:5173
```

### Permitir todos (solo desarrollo):
```env
CORS_ORIGIN=*
```

---

## ✅ Verificar que Funciona

### 1. Verifica en el código:
```bash
npm run test:connection
```

Debería mostrar:
```
CORS_ORIGIN: ✅ Configurada
```

### 2. Prueba desde el frontend:
- Abre la consola del navegador (F12)
- Intenta hacer una petición al backend
- No deberías ver errores de CORS

### 3. Prueba el health check:
```bash
# Local
curl http://localhost:3000/api/health

# Vercel (reemplaza con tu URL)
curl https://tu-backend.vercel.app/api/health
```

---

## 🚨 Errores Comunes

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solución:**
- Verifica que `CORS_ORIGIN` esté configurada correctamente
- Asegúrate de que la URL del frontend coincida exactamente (incluyendo `https://`)
- Haz un redeploy después de cambiar la variable

### Error: "CORS policy: The request client is not a secure context"

**Solución:**
- Asegúrate de usar `https://` en producción
- No uses `http://` en Vercel (solo en desarrollo local)

### El frontend funciona localmente pero no en Vercel

**Solución:**
- Verifica que `CORS_ORIGIN` en Vercel tenga la URL correcta del frontend
- Asegúrate de que la URL no tenga una barra al final (`/`)
- Haz un redeploy del backend después de cambiar la variable

---

## 📝 Resumen Rápido

1. **Local:** Agrega `CORS_ORIGIN=http://localhost:5173` en `.env`
2. **Vercel:** Agrega `CORS_ORIGIN=https://tu-frontend.vercel.app` en Environment Variables
3. **Redeploy:** Después de cambiar, haz un redeploy en Vercel
4. **Verificar:** Usa `npm run test:connection` para verificar

---

## 💡 Tip

Si no estás seguro de la URL del frontend:
- Temporalmente usa `CORS_ORIGIN=*` en Vercel
- Una vez que tengas la URL del frontend, actualízala
- Esto permite que cualquier origen se conecte (solo para desarrollo/pruebas)

