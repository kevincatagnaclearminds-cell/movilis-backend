# 🚨 Solución: Error 500 en Vercel (Serverless Function Crashed)

## ❌ El Error que Ves

```
This Serverless Function has crashed.
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

**Esto NO es normal.** El backend está crasheando al iniciar.

---

## 🔍 Paso 1: Ver los Logs de Vercel

**Esto es lo MÁS IMPORTANTE para diagnosticar el problema:**

1. Ve a tu proyecto en Vercel
2. Click en **Deployments**
3. Click en el deployment que está fallando
4. Click en **Function Logs** (o **Logs**)
5. **Copia los errores que aparecen ahí**

Los logs te dirán exactamente qué está fallando.

---

## 🔧 Causas Comunes y Soluciones

### 1. ❌ Variables de Entorno Faltantes

**Síntoma en logs:**
```
Error: DATABASE_URL no está definida
Error: JWT_SECRET no está definida
```

**Solución:**

1. Ve a **Settings → Environment Variables** en Vercel
2. Verifica que tengas TODAS estas variables:
   - ✅ `DATABASE_URL` (con tu password real de Supabase)
   - ✅ `JWT_SECRET` (genera uno si no lo tienes)
   - ✅ `NODE_ENV=production`
   - ✅ `P12_BASE64` (si usas firma digital)
   - ✅ `P12_PASSWORD` (si usas firma digital)
   - ⚠️ `CORS_ORIGIN` (opcional, pero recomendado)

3. **IMPORTANTE:** Verifica que las variables estén en el ambiente correcto:
   - Selecciona: **Production**, **Preview**, **Development**
   - O al menos **Production**

4. Después de agregar/cambiar variables, haz un **Redeploy**

---

### 2. ❌ Error de Conexión a Supabase

**Síntoma en logs:**
```
Error: Connection timeout
Error: SSL connection required
Error: password authentication failed
```

**Solución:**

#### A) Verifica que `DATABASE_URL` esté correcta:
```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.nnkzwhavjrufjdpokanm.supabase.co:5432/postgres?sslmode=require
```

**⚠️ IMPORTANTE:**
- Reemplaza `TU_PASSWORD` con tu password real
- Si tu password tiene caracteres especiales, codifícalos:
  - `@` → `%40`
  - `#` → `%23`
  - `%` → `%25`
  - `&` → `%26`

#### B) Prueba la conexión localmente:
```bash
npm run test:connection
```

Si funciona localmente pero no en Vercel, el problema es la `DATABASE_URL` en Vercel.

---

### 3. ❌ Error de Prisma Client

**Síntoma en logs:**
```
Error: Cannot find module '@prisma/client'
Error: PrismaClient is not defined
```

**Solución:**

1. Verifica que `package.json` tenga:
   ```json
   "dependencies": {
     "@prisma/client": "^7.2.0",
     "@prisma/adapter-pg": "^7.2.0"
   },
   "devDependencies": {
     "prisma": "^7.2.0"
   }
   ```

2. Verifica que el build incluya Prisma:
   ```json
   "scripts": {
     "build": "npx prisma generate && tsc",
     "vercel-build": "npm run build"
   }
   ```

3. Si el problema persiste, agrega esto a `vercel.json`:
   ```json
   {
     "buildCommand": "npm install && npx prisma generate && npm run build"
   }
   ```

---

### 4. ❌ Error de TypeScript o Compilación

**Síntoma en logs:**
```
Error: Cannot find module 'express'
Error: Cannot find name 'process'
```

**Solución:**

1. Verifica que `@types/node` esté en `dependencies` (no solo en `devDependencies`):
   ```json
   "dependencies": {
     "@types/node": "^24.10.2"
   }
   ```

2. Haz un nuevo deploy después de verificar

---

### 5. ❌ Error de Inicialización de Prisma

**Síntoma en logs:**
```
Error: PrismaClient is unable to run in this browser environment
```

**Solución:**

El problema puede ser que Prisma se está inicializando antes de que las variables de entorno estén cargadas. Ya está solucionado en `api/index.ts` con `import 'dotenv/config'`, pero verifica que esté ahí.

---

## 🔍 Diagnóstico Paso a Paso

### Paso 1: Ver los Logs
1. Vercel → Deployments → Tu deployment → **Function Logs**
2. Copia el error completo
3. Busca la línea que dice `Error:` o `at`

### Paso 2: Verificar Variables de Entorno
1. Vercel → Settings → Environment Variables
2. Verifica que todas estén configuradas
3. Verifica que estén en el ambiente correcto

### Paso 3: Probar Localmente
```bash
# Verifica que funcione localmente
npm run test:connection

# Inicia el servidor
npm run dev

# Prueba el health check
curl http://localhost:3000/api/health
```

Si funciona localmente pero no en Vercel, el problema son las variables de entorno.

---

## 🛠️ Solución Rápida (Checklist)

1. [ ] Ve a **Function Logs** en Vercel y copia el error
2. [ ] Verifica que `DATABASE_URL` esté configurada en Vercel
3. [ ] Verifica que `JWT_SECRET` esté configurada en Vercel
4. [ ] Verifica que `NODE_ENV=production` esté configurada
5. [ ] Verifica que las variables estén en **Production** environment
6. [ ] Haz un **Redeploy** después de cambiar variables
7. [ ] Prueba localmente con `npm run test:connection`

---

## 📋 Variables Mínimas Requeridas

Para que el backend funcione en Vercel, necesitas MÍNIMO:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@db.nnkzwhavjrufjdpokanm.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=tu-secret-generado-aqui
NODE_ENV=production
```

**Opcionales pero recomendadas:**
```env
CORS_ORIGIN=https://tu-frontend.vercel.app
P12_BASE64=[tu-certificado-base64]
P12_PASSWORD=tu-password
```

---

## 🆘 Si Nada Funciona

1. **Comparte los logs:**
   - Ve a Function Logs
   - Copia TODO el error (desde el inicio hasta el final)
   - Compártelo para que pueda ayudarte mejor

2. **Verifica el build:**
   - Ve a Deployments → Tu deployment → **Build Logs**
   - Verifica que el build haya sido exitoso
   - Si hay errores en el build, esos son los que causan el crash

3. **Prueba un health check simple:**
   - Crea un endpoint mínimo para verificar que Vercel funciona
   - Si incluso eso falla, el problema es la configuración de Vercel

---

## 💡 Tip

**El error más común es variables de entorno faltantes o incorrectas.**

Siempre verifica:
1. Que las variables estén en Vercel
2. Que estén en el ambiente correcto (Production)
3. Que los valores sean correctos (especialmente `DATABASE_URL`)

