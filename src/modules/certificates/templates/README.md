# Plantilla de Certificado PDF

Esta carpeta contiene la plantilla PDF base para los certificados.

## Archivo requerido

- `certificado.pdf` - Plantilla base del certificado

## Instrucciones

1. Copia el archivo `certificado.pdf` del frontend (`movilis-certificado/src/features/certificados/templates/certificado.pdf`) a esta carpeta.

2. El sistema usará esta plantilla para generar los certificados, agregando el nombre del usuario obtenido de la base de datos PostgreSQL.

## Fuente opcional

Si deseas usar la fuente personalizada Alex Brush:
- Coloca el archivo `AlexBrush-Regular.ttf` en `src/public/fonts/`
- Si no está disponible, se usará Helvetica como fallback

## Nota

Si la plantilla no está disponible, el sistema usará el método alternativo de generación de PDF (sin plantilla).

