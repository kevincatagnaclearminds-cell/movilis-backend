# ✅ Diagnóstico Completado

## Resultado del Test de Conexión

```
✅ PostgreSQL conectado correctamente via Prisma
📦 Base de datos: postgres
✅ ¡Conexión exitosa!
```

**La conexión a Supabase funciona correctamente.**

---

## ⚠️ Variables Faltantes (No críticas para conexión DB)

- ❌ `JWT_SECRET` - Necesaria para autenticación
- ⚠️ `CORS_ORIGIN` - Necesaria para que el frontend se conecte

---

## 🔍 Posibles Problemas de "No se Conectan"

### 1. Frontend no se conecta al Backend

**Síntomas:**
- Error de CORS en el navegador
- `Network Error` o `Failed to fetch`
- El frontend no puede hacer requests al backend

**Solución:**

#### A) Si el backend está en Vercel:
1. Obtén la URL del backend (ej: `https://movilis-backend.vercel.app`)
2. En el frontend, configura:
   ```env
   VITE_API_URL=https://movilis-backend.vercel.app
   ```
3. En el backend (Vercel), configura:
   ```env
   CORS_ORIGIN=https://tu-frontend.vercel.app
   ```
   O temporalmente para desarrollo:
   ```env
   CORS_ORIGIN=*
   ```

#### B) Si estás probando localmente:
1. Backend local: `http://localhost:3000`
2. Frontend local: `http://localhost:5173` (o el puerto que uses)
3. En backend `.env`:
   ```env
   CORS_ORIGIN=http://localhost:5173
   ```
4. En frontend `.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

---

### 2. Backend no responde en Vercel

**Síntomas:**
- El deploy en Vercel falla
- El backend no responde a `/api/health`
- Error 500 o timeout

**Solución:**

#### A) Verifica el deploy en Vercel:
1. Ve a tu proyecto en Vercel
2. Click en **Deployments**
3. Revisa si hay errores en el build
4. Click en el deployment → **Function Logs** para ver errores

#### B) Verifica variables de entorno en Vercel:
1. Ve a **Settings → Environment Variables**
2. Verifica que todas estén configuradas:
   - `DATABASE_URL` ✅ (ya funciona)
   - `JWT_SECRET` ❌ (falta)
   - `CORS_ORIGIN` ⚠️ (recomendado)
   - `P12_BASE64` ✅ (ya funciona)
   - `P12_PASSWORD` ✅ (ya funciona)
   - `NODE_ENV=production`

#### C) Genera JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado y agrégalo a Vercel como `JWT_SECRET`.

---

### 3. Variables de Entorno no se Cargan en Vercel

**Síntomas:**
- El backend funciona localmente pero no en Vercel
- Errores de "variable no definida"

**Solución:**

#### A) Verifica el Environment:
En Vercel, cada variable puede estar configurada para:
- **Production** - Solo para producción
- **Preview** - Para preview deployments
- **Development** - Para development

Asegúrate de que las variables estén en el ambiente correcto.

#### B) Haz un nuevo deploy:
Después de agregar/cambiar variables, Vercel necesita un nuevo deploy:
1. Ve a **Deployments**
2. Click en los 3 puntos del último deployment
3. Click en **Redeploy**

---

## 📋 Checklist Rápido

### Para que el Frontend se Conecte al Backend:

**Backend (Vercel):**
- [ ] `CORS_ORIGIN` configurada con URL del frontend
- [ ] O temporalmente: `CORS_ORIGIN=*`
- [ ] Deploy exitoso
- [ ] `/api/health` responde: `{"status":"ok"}`

**Frontend:**
- [ ] `VITE_API_URL` configurada con URL del backend
- [ ] Deploy exitoso
- [ ] No hay errores de CORS en la consola

---

## 🚀 Próximos Pasos

1. **Si el backend está en Vercel:**
   - Agrega `JWT_SECRET` y `CORS_ORIGIN` en Vercel
   - Haz un redeploy
   - Prueba: `https://tu-backend.vercel.app/api/health`

2. **Si el frontend no se conecta:**
   - Verifica `VITE_API_URL` en el frontend
   - Verifica `CORS_ORIGIN` en el backend
   - Revisa la consola del navegador para errores

3. **Si necesitas ayuda:**
   - Ejecuta: `npm run test:connection`
   - Revisa los logs de Vercel
   - Comparte el error específico que ves

---

## 💡 Comandos Útiles

```bash
# Probar conexión local
npm run test:connection

# Iniciar backend local
npm run dev

# Probar health check
curl http://localhost:3000/api/health

# Probar health check en Vercel (reemplaza con tu URL)
curl https://tu-backend.vercel.app/api/health
```

