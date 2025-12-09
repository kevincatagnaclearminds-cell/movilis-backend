# Guía de Migración a TypeScript

Este documento describe el proceso de migración del backend de JavaScript a TypeScript.

## Estado Actual

✅ **Completado:**
- Configuración de TypeScript (`tsconfig.json`)
- Tipos base (`src/types/index.ts`)
- Configuración (`src/config/config.ts`, `src/config/postgres.ts`)
- Middleware (`src/middleware/auth.ts`, `src/middleware/errorHandler.ts`, `src/middleware/notFound.ts`)
- App principal (`src/app.ts`, `src/index.ts`)
- Módulo de usuarios (`src/modules/users/services/user.postgres.service.ts`, `src/modules/users/controllers/user.controller.ts`, `src/modules/users/routes/user.routes.ts`)
- Módulo de autenticación (`src/modules/auth/services/auth.service.ts`, `src/modules/auth/controllers/auth.controller.ts`, `src/modules/auth/routes/auth.routes.ts`)

⏳ **Pendiente:**
- Módulo de certificados (servicios, controladores, rutas)
- Módulo de firma
- Utilidades y helpers

## Cómo Continuar

Para completar la migración, necesitas convertir los archivos restantes de `.js` a `.ts`. Los archivos ya convertidos pueden servir como referencia.

## Notas Importantes

1. **Mantener compatibilidad**: Los archivos `.js` originales se mantienen hasta que todos estén convertidos
2. **Tipos**: Usa los tipos definidos en `src/types/index.ts`
3. **Imports**: Cambia `require()` por `import` y `module.exports` por `export default` o `export`
4. **Testing**: Prueba cada módulo después de convertirlo


