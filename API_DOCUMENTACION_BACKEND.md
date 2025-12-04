# 📡 Documentación API - Backend Movilis Certificados

## Información General

| Campo | Valor |
|-------|-------|
| **Base URL** | `http://localhost:3000/api` |
| **Formato** | JSON |
| **Autenticación** | Bearer Token (JWT) |
| **Content-Type** | `application/json` |

---

## 🔐 Autenticación

### 1. Registrar Usuario

```
POST /api/auth/register
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (Request):**
```json
{
  "name": "string",      // Nombre completo del usuario
  "email": "string",     // Email único
  "password": "string"   // Contraseña (mínimo 6 caracteres)
}
```

**Response (200 - Éxito):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  },
  "token": "string",     // JWT Token
  "message": "Usuario registrado exitosamente"
}
```

**Response (400 - Error):**
```json
{
  "message": "El email ya está registrado",
  "error": "string"
}
```

---

### 2. Iniciar Sesión

```
POST /api/auth/login
```

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (Request):**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 - Éxito):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  },
  "token": "string",     // JWT Token
  "message": "Inicio de sesión exitoso"
}
```

**Response (401 - Error):**
```json
{
  "message": "Credenciales inválidas",
  "error": "string"
}
```

---

### 3. Cerrar Sesión

```
POST /api/auth/logout
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

**Response (200 - Éxito):**
```json
{
  "message": "Sesión cerrada correctamente"
}
```

---

### 4. Verificar Token

```
GET /api/auth/verify
```

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 - Token válido):**
```json
{
  "valid": true,
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```

**Response (401 - Token inválido):**
```json
{
  "valid": false,
  "message": "Token inválido o expirado"
}
```

---

## 📜 Certificados

### 5. Listar Certificados del Usuario

```
GET /api/certificados
```

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Query Parameters (opcionales):**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `tipo` | string | Filtrar por tipo (capacitacion, laboral, etc.) |
| `estado` | string | Filtrar por estado (vigente, vencido) |

**Response (200 - Éxito):**
```json
{
  "success": true,
  "certificados": [
    {
      "id": "string",
      "tipo": "capacitacion",           // Tipos: laboral, ingresos, capacitacion, participacion, competencia, otro
      "titulo": "Certificado de Marketing Digital",
      "descripcion": "Descripción del certificado...",
      "fechaEmision": "2025-12-04",      // Formato: YYYY-MM-DD
      "fechaVencimiento": "2026-12-04",  // Opcional, formato: YYYY-MM-DD
      "estado": "vigente",               // Estados: vigente, vencido, revocado, pendiente
      "entidadEmisora": "Movilis S.A.S",
      "codigoVerificacion": "MOV-MKT-123456",
      "firmado": true
    }
  ],
  "total": 2
}
```

---

### 6. Descargar Certificado (PDF)

```
GET /api/certificados/download/:id
```

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | ID del certificado |

**Response (200 - Éxito):**
- Content-Type: `application/pdf`
- Body: Archivo PDF binario

**Response (404 - Error):**
```json
{
  "message": "Certificado no encontrado"
}
```

---

### 7. Verificar Autenticidad de Certificado

```
GET /api/certificados/verify/:codigo
```

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `codigo` | string | Código de verificación del certificado |

**Response (200 - Válido):**
```json
{
  "valid": true,
  "certificado": {
    "id": "string",
    "titulo": "string",
    "fechaEmision": "2025-12-04",
    "entidadEmisora": "Movilis S.A.S",
    "estado": "vigente"
  }
}
```

**Response (404 - No encontrado):**
```json
{
  "valid": false,
  "message": "Certificado no encontrado o código inválido"
}
```

---

## 👤 Usuarios

### 8. Obtener Perfil del Usuario

```
GET /api/users/profile
```

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 - Éxito):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "createdAt": "2025-12-04T10:00:00Z"
  }
}
```

---

## ❤️ Health Check

### 9. Verificar Estado del Servidor

```
GET /api/health
```

**Response (200 - Servidor activo):**
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T10:00:00Z"
}
```

---

## 📋 Resumen de Endpoints

| # | Método | Endpoint | Autenticación | Descripción |
|---|--------|----------|---------------|-------------|
| 1 | `POST` | `/api/auth/register` | ❌ No | Registrar nuevo usuario |
| 2 | `POST` | `/api/auth/login` | ❌ No | Iniciar sesión |
| 3 | `POST` | `/api/auth/logout` | ✅ Sí | Cerrar sesión |
| 4 | `GET` | `/api/auth/verify` | ✅ Sí | Verificar token JWT |
| 5 | `GET` | `/api/certificados` | ✅ Sí | Listar certificados |
| 6 | `GET` | `/api/certificados/download/:id` | ✅ Sí | Descargar PDF |
| 7 | `GET` | `/api/certificados/verify/:codigo` | ❌ No | Verificar autenticidad |
| 8 | `GET` | `/api/users/profile` | ✅ Sí | Obtener perfil |
| 9 | `GET` | `/api/health` | ❌ No | Estado del servidor |

---

## 🔑 Tipos de Certificados

| Tipo | Descripción |
|------|-------------|
| `laboral` | Certificados laborales |
| `ingresos` | Certificados de ingresos |
| `capacitacion` | Certificados de capacitación/cursos |
| `participacion` | Certificados de participación |
| `competencia` | Certificados de competencia laboral |
| `otro` | Otros tipos de certificados |

---

## 📊 Estados de Certificados

| Estado | Descripción |
|--------|-------------|
| `vigente` | Certificado válido y activo |
| `vencido` | Certificado expirado |
| `revocado` | Certificado anulado |
| `pendiente` | Certificado en proceso |

---

## ⚠️ Códigos de Error HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Éxito |
| `201` | Creado exitosamente |
| `400` | Error en la solicitud (datos inválidos) |
| `401` | No autorizado (token inválido o faltante) |
| `404` | Recurso no encontrado |
| `500` | Error interno del servidor |

---

## 🔧 Ejemplo de Implementación (Node.js/Express)

```javascript
// Ejemplo básico de estructura
const express = require('express');
const app = express();

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  // ... lógica de registro
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // ... lógica de login
});

// Certificados routes (requieren autenticación)
app.get('/api/certificados', authMiddleware, (req, res) => {
  // ... obtener certificados del usuario
});

app.listen(3000, () => {
  console.log('Backend corriendo en http://localhost:3000');
});
```

---

## 📞 Contacto

Si tienes dudas sobre la implementación de estos endpoints, contacta al equipo de frontend.

**Frontend URL:** `http://localhost:5173` (o el puerto que esté disponible)
**Backend URL esperada:** `http://localhost:3000/api`

