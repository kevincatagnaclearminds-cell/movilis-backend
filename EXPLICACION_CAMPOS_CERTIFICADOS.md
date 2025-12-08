# 📋 Explicación de Campos de la Tabla `certificates`

## ✅ CAMPOS ESENCIALES (NECESARIOS)

### 1. `id` (SERIAL PRIMARY KEY)
- **¿Para qué?** Identificador único del certificado en la base de datos
- **¿Se usa?** ✅ SÍ - Para todas las búsquedas y relaciones
- **¿Eliminar?** ❌ NO - Es la clave primaria

### 2. `certificate_number` (VARCHAR(50) UNIQUE)
- **¿Para qué?** Número único del certificado (ej: "CERT-ABC12345")
- **¿Se usa?** ✅ SÍ - Se muestra en el PDF y se usa para búsquedas
- **¿Eliminar?** ❌ NO - Es el identificador público del certificado

### 3. `recipient_name` (VARCHAR(200))
- **¿Para qué?** Nombre completo del destinatario
- **¿Se usa?** ✅ SÍ - Se imprime en el PDF del certificado
- **¿Eliminar?** ❌ NO - Es esencial para el certificado

### 4. `recipient_email` (VARCHAR(255))
- **¿Para qué?** Email del destinatario
- **¿Se usa?** ✅ SÍ - Para buscar certificados por usuario y obtener datos desde PostgreSQL
- **¿Eliminar?** ❌ NO - Se usa para búsquedas y relacionar con usuarios

### 5. `course_name` (VARCHAR(255))
- **¿Para qué?** Nombre del curso/certificación
- **¿Se usa?** ✅ SÍ - Se imprime en el PDF
- **¿Eliminar?** ❌ NO - Es información esencial del certificado

### 6. `issuer_id` (INTEGER, FK a users)
- **¿Para qué?** ID del usuario que emite el certificado
- **¿Se usa?** ✅ SÍ - Para permisos y mostrar quién lo emitió
- **¿Eliminar?** ❌ NO - Necesario para auditoría y permisos

### 7. `status` (VARCHAR(20))
- **¿Para qué?** Estado: 'draft', 'issued', 'revoked', 'expired'
- **¿Se usa?** ✅ SÍ - Controla el flujo del certificado
- **¿Eliminar?** ❌ NO - Esencial para el flujo de trabajo

### 8. `verification_code` (VARCHAR(100) UNIQUE)
- **¿Para qué?** Código único para verificar el certificado públicamente
- **¿Se usa?** ✅ SÍ - Para la verificación pública (endpoint /verify/:code)
- **¿Eliminar?** ❌ NO - Necesario para verificación

### 9. `created_at`, `updated_at` (TIMESTAMP)
- **¿Para qué?** Fechas de creación y última actualización
- **¿Se usa?** ✅ SÍ - Para auditoría y ordenamiento
- **¿Eliminar?** ❌ NO - Buenas prácticas de base de datos

---

## ⚠️ CAMPOS OPCIONALES (PERO ÚTILES)

### 10. `course_description` (TEXT)
- **¿Para qué?** Descripción detallada del curso
- **¿Se usa?** ⚠️ OPCIONAL - Se puede mostrar en el PDF o en detalles
- **¿Eliminar?** ✅ PUEDES - Si no necesitas descripciones detalladas
- **Recomendación:** Déjalo si planeas mostrar más información en el certificado

### 11. `expiration_date` (TIMESTAMP)
- **¿Para qué?** Fecha de expiración del certificado
- **¿Se usa?** ⚠️ OPCIONAL - Algunos certificados no expiran
- **¿Eliminar?** ✅ PUEDES - Si todos tus certificados son permanentes
- **Recomendación:** Déjalo si algunos certificados pueden expirar

### 12. `recipient_id` (INTEGER, FK a users, NULLABLE)
- **¿Para qué?** ID del usuario destinatario (si está registrado en el sistema)
- **¿Se usa?** ⚠️ OPCIONAL - Solo si el destinatario es usuario del sistema
- **¿Eliminar?** ✅ PUEDES - Si los certificados son para personas externas
- **Recomendación:** Déjalo si quieres relacionar certificados con usuarios registrados

### 13. `issue_date` (TIMESTAMP)
- **¿Para qué?** Fecha de emisión del certificado
- **¿Se usa?** ⚠️ OPCIONAL - Puede ser igual a `created_at`
- **¿Eliminar?** ✅ PUEDES - Si `created_at` es suficiente
- **Recomendación:** Déjalo si quieres poder emitir certificados con fecha retroactiva

---

## 🔧 CAMPOS TÉCNICOS (PARA FUNCIONAMIENTO)

### 14. `google_drive_file_id` (VARCHAR(255) UNIQUE)
- **¿Para qué?** ID del archivo PDF en Google Drive
- **¿Se usa?** ✅ SÍ - Para descargar desde Google Drive sin regenerar
- **¿Eliminar?** ❌ NO - Es parte del flujo de Google Drive
- **Nota:** Si no usas Google Drive, puede ser NULL

### 15. `pdf_path` (VARCHAR(500))
- **¿Para qué?** Ruta local del archivo PDF (fallback si no hay Google Drive)
- **¿Se usa?** ⚠️ OPCIONAL - Solo si no usas Google Drive o como respaldo
- **¿Eliminar?** ✅ PUEDES - Si siempre usas Google Drive
- **Recomendación:** Déjalo como respaldo

### 16. `is_verified` (BOOLEAN)
- **¿Para qué?** Indica si el certificado ha sido verificado/emitido
- **¿Se usa?** ⚠️ OPCIONAL - Similar a `status = 'issued'`
- **¿Eliminar?** ✅ PUEDES - Si `status` es suficiente
- **Recomendación:** Puedes eliminarlo y usar solo `status`

---

## 📊 RESUMEN: ¿QUÉ PUEDES ELIMINAR?

### ✅ PUEDES ELIMINAR (si no los necesitas):
1. `course_description` - Si no muestras descripciones
2. `expiration_date` - Si todos los certificados son permanentes
3. `recipient_id` - Si los certificados son para personas externas
4. `issue_date` - Si `created_at` es suficiente
5. `is_verified` - Si `status` es suficiente
6. `pdf_path` - Si siempre usas Google Drive

### ❌ NO ELIMINAR (esenciales):
- `id`, `certificate_number`, `recipient_name`, `recipient_email`
- `course_name`, `issuer_id`, `status`, `verification_code`
- `google_drive_file_id`, `created_at`, `updated_at`

---

## 🎯 TABLA MÍNIMA RECOMENDADA

Si quieres la versión más simple:

```sql
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    issuer_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    verification_code VARCHAR(100) UNIQUE NOT NULL,
    google_drive_file_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos eliminados:** `course_description`, `expiration_date`, `recipient_id`, `issue_date`, `pdf_path`, `is_verified`

