# 🔗 ¿Qué URL Usar para CORS_ORIGIN?

## 📍 En Vercel Tienes 2 Tipos de URLs

### 1. 🏷️ **Domain** (Dominio Principal) ✅ **USA ESTA**
- Es la URL **permanente** de tu proyecto
- No cambia con cada deployment
- Es la URL que los usuarios realmente usan
- Ejemplo: `https://movilis-frontend.vercel.app`

### 2. 🔄 **Deployment URL** (URL Temporal) ❌ **NO USES ESTA**
- Es una URL **temporal** que cambia con cada deployment
- Se ve así: `https://movilis-frontend-abc123xyz.vercel.app`
- Solo sirve para pruebas temporales
- Cambia cada vez que haces un nuevo deploy

---

## ✅ Solución: Usa el **Domain**

### Paso 1: Encuentra el Domain en Vercel

1. Ve a tu proyecto del **frontend** en Vercel
2. Click en **Settings** (Configuración)
3. Click en **Domains** (Dominios)
4. Verás algo como:
   ```
   movilis-frontend.vercel.app
   ```
   O si tienes un dominio personalizado:
   ```
   app.movilis.com
   ```

### Paso 2: Copia la URL Completa

Copia la URL completa con `https://`:
```
https://movilis-frontend.vercel.app
```

### Paso 3: Úsala en CORS_ORIGIN

En el **backend** (Vercel), configura:
```
CORS_ORIGIN=https://movilis-frontend.vercel.app
```

---

## 📋 Ejemplo Visual

### En Vercel verás algo así:

**Settings → Domains:**
```
✅ movilis-frontend.vercel.app
   (Este es el Domain - USA ESTE)
```

**Deployments:**
```
🔗 https://movilis-frontend-abc123xyz.vercel.app
   (Esta es la Deployment URL - NO USES ESTA)
```

---

## ⚠️ ¿Qué Pasa si Uso la Deployment URL?

- ❌ La URL cambiará con cada nuevo deployment
- ❌ Tendrás que actualizar `CORS_ORIGIN` cada vez
- ❌ El frontend dejará de funcionar después de cada deploy
- ❌ Es un dolor de cabeza constante

---

## ✅ ¿Qué Pasa si Uso el Domain?

- ✅ La URL es permanente
- ✅ No necesitas actualizarla nunca más
- ✅ Funciona siempre, sin importar cuántos deployments hagas
- ✅ Es la forma correcta de hacerlo

---

## 🔍 ¿No Encuentras el Domain?

### Opción 1: Ver en la Página Principal

1. Ve a tu proyecto en Vercel
2. En la parte superior verás la URL del proyecto
3. Esa es tu Domain URL

### Opción 2: Ver en Deployments

1. Ve a **Deployments**
2. Click en cualquier deployment
3. Verás dos URLs:
   - Una que dice "Visit" (esa es la Domain)
   - Una que tiene un código largo (esa es la Deployment URL)

### Opción 3: Si No Tienes Domain Configurado

Si no ves ningún domain, Vercel te asignará uno automáticamente:
- Formato: `tu-proyecto.vercel.app`
- Ejemplo: `movilis-frontend.vercel.app`

---

## 📝 Resumen

1. **Ve a:** Settings → Domains en tu proyecto del frontend
2. **Copia:** La URL que aparece ahí (ej: `movilis-frontend.vercel.app`)
3. **Agrega:** `https://` al inicio
4. **Configura:** `CORS_ORIGIN=https://movilis-frontend.vercel.app` en el backend
5. **Listo:** Funcionará para siempre

---

## 💡 Tip Extra

Si tienes múltiples dominios (por ejemplo, uno para producción y otro para preview), puedes configurar múltiples orígenes:

```
CORS_ORIGIN=https://movilis-frontend.vercel.app,https://movilis-frontend-git-main.vercel.app
```

Pero normalmente solo necesitas el dominio principal.

