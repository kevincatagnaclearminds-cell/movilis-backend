# 🚨 Pasos para Diagnosticar el Error 500 en Vercel

## ⚠️ Esto NO es Normal

El error que ves significa que el backend está **crasheando** al iniciar.

---

## 🔍 Paso 1: Ver los Logs (MÁS IMPORTANTE)

**Esto te dirá exactamente qué está fallando:**

1. Ve a tu proyecto en Vercel
2. Click en **Deployments** (Despliegues)
3. Click en el deployment que está fallando (el que tiene el error)
4. Click en **Function Logs** o **Logs**
5. **Copia TODO el error que aparece ahí**

Los logs mostrarán algo como:
```
Error: DATABASE_URL no está definida
at ...
```

O:
```
Error: Connection timeout
at ...
```

---

## 🔧 Paso 2: Verificar Variables de Entorno

**El 90% de los errores 500 son por variables faltantes:**

1. Ve a **Settings** → **Environment Variables**
2. Verifica que tengas estas variables configuradas:

### ✅ Variables REQUERIDAS:
- [ ] `DATABASE_URL` - Con tu password real de Supabase
- [ ] `JWT_SECRET` - Genera uno si no lo tienes
- [ ] `NODE_ENV=production`

### ⚠️ Variables OPCIONALES (pero recomendadas):
- [ ] `CORS_ORIGIN` - URL de tu frontend
- [ ] `P12_BASE64` - Si usas firma digital
- [ ] `P12_PASSWORD` - Si usas firma digital

3. **IMPORTANTE:** Verifica que las variables estén en el ambiente correcto:
   - Selecciona: **Production**, **Preview**, **Development**
   - O al menos **Production**

---

## 🛠️ Paso 3: Generar JWT_SECRET (si falta)

Si no tienes `JWT_SECRET`, genera uno:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado y agrégalo a Vercel como `JWT_SECRET`.

---

## 🔄 Paso 4: Redeploy

**Después de agregar/cambiar variables:**

1. Ve a **Deployments**
2. Click en los 3 puntos del último deployment
3. Click en **Redeploy**
4. Espera a que termine
5. Prueba de nuevo

---

## 📋 Checklist Rápido

- [ ] Vi los **Function Logs** y copié el error
- [ ] Verifiqué que `DATABASE_URL` esté configurada
- [ ] Verifiqué que `JWT_SECRET` esté configurada
- [ ] Verifiqué que `NODE_ENV=production` esté configurada
- [ ] Verifiqué que las variables estén en **Production** environment
- [ ] Hice un **Redeploy** después de cambiar variables

---

## 🆘 Si Sigue Fallando

**Comparte conmigo:**
1. El error completo de los **Function Logs**
2. Qué variables tienes configuradas en Vercel (sin mostrar passwords)
3. Si funciona localmente (`npm run dev`)

Con esa información podré ayudarte mejor.

---

## 💡 Causas Más Comunes

1. **`DATABASE_URL` no configurada** (90% de los casos)
2. **`JWT_SECRET` no configurada**
3. **Variables en ambiente incorrecto** (Development en vez de Production)
4. **Password de Supabase con caracteres especiales** sin codificar
5. **Error en el build** (revisa Build Logs)

