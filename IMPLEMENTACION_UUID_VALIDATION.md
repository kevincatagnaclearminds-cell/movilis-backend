# Resumen: Validación de UUID - Fix para "Invalid input syntax for type uuid: \"\""

## Problema Original
```
Error: Invalid prisma.certificados.create() invocation
Invalid input value: invalid input syntax for type uuid: ""
```

El frontend enviaba `destinatarioId: ""` o `userIds` con elementos vacíos, y Postgres rechazaba insertar UUIDs vacíos.

---

## Solución Implementada

### 1. **certificate.prisma.service.ts** - 3 funciones de sanitización

#### `isValidUUID(value: unknown): boolean`
- ✅ Valida que sea string no vacío
- ✅ Usa `uuid.validate()` para verificar formato
- ✅ Rechaza explícitamente cadenas vacías

#### `sanitizeDestinationId(data: any): string`
- ✅ Extrae UUID de objeto o string
- ✅ Soporta múltiples nombres de campo (destinatarioId, recipientId)
- ✅ Devuelve string vacío si no encuentra UUID válido

#### `sanitizeUserIds(userIds: any[]): string[]`
- ✅ Filtra array eliminando valores vacíos, nulos, inválidos
- ✅ Valida cada UUID con isValidUUID()
- ✅ Elimina duplicados automáticamente

#### En `createCertificate()`
```typescript
// ANTES (vulnerable):
destinatarioId = (typeof certificateData.destinatarioId === 'string' ? certificateData.destinatarioId : '') || '';
// ↑ Podría ser "" → Prisma falla

// AHORA (seguro):
const destinatarioId = sanitizeDestinationId(certificateData);
if (!isValidUUID(destinatarioId)) {
  throw new Error('destinatarioId es requerido y debe ser un UUID válido (no puede estar vacío)');
}
// ↑ Falla ANTES de Prisma con error legible
```

### 2. **certificate.controller.ts** - Manejo de errores HTTP 400

Ambos métodos (`createCertificate` y `createCertificateQuick`) ahora detectan errores de validación UUID:

```typescript
catch (error) {
  const err = error as Error;
  if (err.message && (err.message.includes('UUID válido') || err.message.includes('vacío'))) {
    // ✅ Responder HTTP 400 con detalles claros
    res.status(400).json({
      success: false,
      error: {
        message: 'Datos de entrada inválidos',
        details: err.message
      }
    });
    return;
  }
  next(error); // Otros errores al middleware
}
```

### 3. **Logging mejorado** para debugging

```typescript
console.debug('📋 [Certificate] Payload recibido:', { destinatarioId, userIds, ... });
console.debug('📋 [Certificate] Datos sanitizados:', { emisorId, validUserIds, ... });
console.debug('🔍 [Prisma] Data para create:', { numero_certificado, ... });
```

---

## Comportamiento por Caso

| Entrada | Resultado | HTTP | Detalle |
|---------|-----------|------|--------|
| `destinatarioId: ""` | ❌ Rechazado | 400 | "UUID válido (no puede estar vacío)" |
| `destinatarioId: "invalid"` | ❌ Rechazado | 400 | "UUID válido" |
| `userIds: ["", valid, null]` | ✅ Solo valid | 201 | Se filtra automáticamente |
| `destinatarioId: "valid-uuid"` | ✅ Aceptado | 201 | Prisma.create() success |

---

## Testing

### Prueba 1: destinatarioId vacío (debe fallar)
```bash
curl -X POST http://localhost:3000/api/certificados \
  -H "Content-Type: application/json" \
  -d '{"courseName":"Test","destinatarioId":""}'
```
**Esperado**: HTTP 400 con mensaje "UUID válido"

### Prueba 2: userIds mixtos (debe aceptar solo válidos)
```bash
curl -X POST http://localhost:3000/api/certificados \
  -H "Content-Type: application/json" \
  -d '{"courseName":"Test","destinatarioId":"550e8400-e29b-41d4-a716-446655440000","userIds":["","valid-uuid",null]}'
```
**Esperado**: HTTP 201, solo "valid-uuid" asignado

### Prueba 3: Payload correcto (debe funcionar)
```bash
curl -X POST http://localhost:3000/api/certificados \
  -H "Content-Type: application/json" \
  -d '{"courseName":"Test","destinatarioId":"550e8400-e29b-41d4-a716-446655440000"}'
```
**Esperado**: HTTP 201, certificado creado

---

## Ventajas de la Solución

✅ **Falla antes de Prisma**: Validación en memory, sin queries DB fallidas  
✅ **Errores legibles**: HTTP 400 con mensaje claro (no 500 de Postgres)  
✅ **Compatibilidad**: Sigue aceptando múltiples formatos de entrada  
✅ **Filtrado automático**: userIds con elementos vacíos se limpian silenciosamente  
✅ **Logging completo**: Debug logs para rastrear sanitización  
✅ **Sin cambios de API**: Interfaz publica igual, cambios internos solamente  

---

## Archivos Modificados

1. ✅ `src/modules/certificates/services/certificate.prisma.service.ts`
   - Agregadas 3 funciones de sanitización
   - Actualizado `createCertificate()` con validación
   - Logging de debug agregado

2. ✅ `src/modules/certificates/controllers/certificate.controller.ts`
   - Manejo de errores UUID en `createCertificate()`
   - Manejo de errores UUID en `createCertificateQuick()`
   - Devuelve HTTP 400 para validaciones fallidas

3. ✅ Compilación TypeScript: **SUCCESS**

---

## Estadísticas de Cambios

- **Líneas agregadas**: ~95 (incluyendo funciones y logging)
- **Líneas modificadas**: ~40
- **Funciones nuevas**: 3 (`isValidUUID`, `sanitizeDestinationId`, `sanitizeUserIds`)
- **Métodos actualizados**: 4 (createCertificate x2, createCertificateQuick x2)
- **Compilación**: ✅ Sin errores TypeScript

---

## Próximas Mejoras (Opcional)

### Fase 2: Validación Frontend
- Agregar validación en el formulario del frontend antes de enviar
- Mostrar error visualmente si el usuario no selecciona destinatario

### Fase 3: Schema Validation
- Usar `zod` o `joi` para validación más robusta
- Schema reusable para controller + service

### Fase 4: Tests Unitarios
- Jest tests para `isValidUUID()`, `sanitizeUserIds()`
- Integration tests para endpoints POST /certificados

---

**Implementación completada**: 2026-01-09  
**Compilación**: ✅ SUCCESS  
**Listo para testing**: ✅ YES
