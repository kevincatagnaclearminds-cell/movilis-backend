# 🚀 Guía de Configuración - Movilis Backend

## Pasos para configurar el proyecto

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Base de datos (MongoDB)
MONGODB_URI=mongodb://localhost:27017/movilis-certificates

# Puerto del servidor
PORT=3000

# Entorno
NODE_ENV=development

# JWT
JWT_SECRET=tu-secret-key-super-segura-cambiar-en-produccion
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Nota:** 
- Ajusta la URL de MongoDB según tu configuración
- Para producción, usa un `JWT_SECRET` fuerte y seguro

### 3. Configurar MongoDB

#### Opción A: MongoDB Local
1. Instala MongoDB si no lo tienes
2. Inicia el servicio de MongoDB
3. La base de datos se creará automáticamente al conectarse

#### Opción B: MongoDB Atlas (Cloud)
Si usas MongoDB Atlas, actualiza el `.env` con tu connection string:
```env
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/movilis-certificates
```

### 4. Iniciar el servidor

#### Modo desarrollo (con nodemon):
```bash
npm run dev
```

#### Modo producción:
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

### 5. Verificar que funciona

Abre tu navegador o usa curl:
```bash
curl http://localhost:3000/health
```

Deberías recibir una respuesta JSON indicando que el servidor está funcionando.

---

## Estructura del proyecto

```
src/
├── config/              # Configuración (DB, variables de entorno)
├── middleware/          # Middlewares (auth, errores, 404)
├── modules/            # Módulos de la aplicación
│   ├── auth/           # Autenticación
│   ├── users/          # Gestión de usuarios
│   └── certificates/   # Módulo de certificados
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
└── utils/              # Utilidades compartidas
```

---

## Estructura de la API

### Endpoints principales:

- **Auth:**
  - `POST /api/auth/register` - Registro de usuarios
  - `POST /api/auth/login` - Inicio de sesión
  - `GET /api/auth/me` - Obtener usuario actual

- **Certificados:**
  - `POST /api/certificates` - Crear certificado
  - `GET /api/certificates` - Listar certificados
  - `GET /api/certificates/:id` - Obtener certificado
  - `POST /api/certificates/:id/issue` - Emitir certificado (generar PDF)
  - `GET /api/certificates/:id/download` - Descargar PDF
  - `GET /api/certificates/:id/view` - Ver PDF en navegador
  - `GET /api/certificates/verify/:code` - Verificar certificado (público)
  - `POST /api/certificates/:id/revoke` - Revocar certificado
  - `GET /api/certificates/statistics` - Estadísticas

- **Usuarios:**
  - `GET /api/users` - Listar usuarios (solo admin)
  - `GET /api/users/:id` - Obtener usuario
  - `PUT /api/users/:id` - Actualizar usuario
  - `DELETE /api/users/:id` - Eliminar usuario (solo admin)

---

## Roles de usuario

- **admin**: Acceso completo al sistema
- **issuer**: Puede crear y emitir certificados
- **user**: Usuario regular

---

## Solución de problemas

### Error: "Can't reach database server"
- Verifica que MongoDB esté corriendo
- Revisa la URL de conexión en `.env`
- Asegúrate de que el puerto 27017 esté disponible

### Error: "MongoServerError: Authentication failed"
- Verifica las credenciales en la URL de MongoDB
- Si usas MongoDB Atlas, asegúrate de que la IP esté en la whitelist

### Error: "Port already in use"
- Cambia el puerto en `.env` o detén el proceso que está usando el puerto 3000

---

## Próximos pasos

1. Configura tu base de datos MongoDB
2. Inicia el servidor
3. Prueba los endpoints con Postman o similar
4. Personaliza los modelos según tus necesidades
5. Configura variables de entorno para producción

¡Listo! 🎉
