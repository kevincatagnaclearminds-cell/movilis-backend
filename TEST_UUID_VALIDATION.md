# Pruebas de Validación de UUID

## Resumen de cambios

Se han implementado validaciones robustas en el backend para garantizar que nunca se pase UUIDs vacíos a Prisma.

### Archivos modificados:
1. **certificate.prisma.service.ts** - Funciones de sanitización
2. **certificate.controller.ts** - Manejo de errores HTTP 400

---

## Test 1: destinatarioId vacío ("")

**Payload:**
```json
{
  "courseName": "Curso Test",
  "institucion": "Movilis",
  "destinatarioId": ""
}
```

**Respuesta esperada:**
```
HTTP 400 Bad Request
{
  "success": false,
  "error": {
    "message": "Datos de entrada inválidos",
    "details": "destinatarioId es requerido y debe ser un UUID válido (no puede estar vacío)"
  }
}
```

**Logs en backend:**
```
❌ [Certificate] destinatarioId inválido o vacío: 
```

---

## Test 2: userIds con elementos vacíos

**Payload:**
```json
{
  "courseName": "Curso Test",
  "institucion": "Movilis",
  "destinatarioId": "550e8400-e29b-41d4-a716-446655440000",
  "userIds": ["", "550e8400-e29b-41d4-a716-446655440001", null, "invalid-uuid"]
}
```

**Comportamiento:**
- Los UUIDs vacíos ("") se filtran automáticamente
- Los valores null se ignoran
- Los UUIDs inválidos se rechazan
- Solo se asignan: `["550e8400-e29b-41d4-a716-446655440001"]`

**Logs en backend:**
```
📋 [Certificate] Datos sanitizados: {
  emisorId: "550e8400-e29b-41d4-a716-446655440000",
  destinatarioId: "550e8400-e29b-41d4-a716-446655440000",
  validUserIds: ["550e8400-e29b-41d4-a716-446655440001"],
  userIdCount: 1
}
```

---

## Test 3: Payload correcto

**Payload:**
```json
{
  "courseName": "Curso Test",
  "institucion": "Movilis",
  "destinatarioId": "550e8400-e29b-41d4-a716-446655440000",
  "expirationDate": "2026-12-31"
}
```

**Respuesta esperada:**
```
HTTP 201 Created
{
  "success": true,
  "data": { /* certificado creado */ },
  "message": "Certificado creado exitosamente"
}
```

**Logs en backend:**
```
📋 [Certificate] Payload recibido: { ... }
📋 [Certificate] Datos sanitizados: { ... }
🔍 [Prisma] Data para create: { numero_certificado, ... }
✅ Certificado creado exitosamente
```

---

## Nuevas funciones de sanitización

### isValidUUID(value: unknown): boolean
```typescript
- Valida que value sea un string no vacío
- Usa uuid.validate() para verificar formato
- Rechaza cadenas vacías ("")
```

### sanitizeDestinationId(data: any): string
```typescript
- Extrae UUID de objeto o string
- Valida múltiples campos (destinatarioId, recipientId)
- Devuelve string vacío si no es válido (capturado por validación posterior)
```

### sanitizeUserIds(userIds: any[]): string[]
```typescript
- Filtra array eliminando valores vacíos/nulos
- Valida cada UUID con isValidUUID()
- Elimina duplicados
- Devuelve solo UUIDs válidos
```

---

## Manejo de errores en el controller

En ambos `createCertificate` y `createCertificateQuick`:

```typescript
catch (error) {
  const err = error as Error;
  if (err.message && (err.message.includes('UUID válido') || ...)) {
    // Devolver HTTP 400 con detalles
    res.status(400).json({
      success: false,
      error: {
        message: 'Datos de entrada inválidos',
        details: err.message
      }
    });
    return;
  }
  // Otros errores → middleware de manejo de errores
  next(error);
}
```

---

## Ventajas

✅ **Validación temprana**: Rechaza datos antes de tocar Prisma
✅ **Errores claros**: HTTP 400 con mensaje explícito  
✅ **Sin errores Prisma**: Nunca llega data inválida a la BD
✅ **Logging debug**: Visibilidad total del flujo de datos
✅ **Compatibilidad**: Sigue soportando múltiples formatos de entrada

---

## Próximos pasos recomendados

1. ✅ Implementado: Validación de UUID en backend
2. 📋 Recomendado: Agregar validación en frontend (evitar envíos innecesarios)
3. 📋 Opcional: Usar librería `zod` o `joi` para validación más robusta
4. 📋 Optional: Agregar test unitarios con Jest
