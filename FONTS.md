# Fuentes para el nombre del certificado

El nombre usa **Lora Bold Italic** por defecto (font-weight 700, font-style italic), **el mismo estilo que este embed de Google Fonts**:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,700&display=swap" rel="stylesheet">
```

```css
.lora-bold-italic {
  font-family: "Lora", serif;
  font-weight: 700;
  font-style: italic;
}
```

También hay **Great Vibes**, **Story Script** y **Dancing Script**. Las fuentes se **descargan solas** si no existen en `public/fonts/` (TTF o, para Lora, woff2 desde `fonts.gstatic.com`).

## ¿Cómo funciona?

1. Al generar un certificado, el servicio comprueba si existen `Lora-BoldItalic.ttf` o `Lora-BoldItalic.woff2`, y el resto de fuentes, en `public/fonts/`.
2. Si no existen, intenta descargarlas (TTF desde jsDelivr; Lora también desde `fonts.gstatic.com`, mismo que el CSS de arriba).
3. Se usan los archivos locales.

## URLs (estilo Google Fonts)

- **Lora Bold Italic** (ital 1, wght 700): TTF desde jsDelivr o **woff2** desde `https://fonts.gstatic.com/s/lora/v37/0QI8MX1D_JOuMw_hLdO6T2wV9KnW-C0Coq92nA.woff2` (latin, mismo que el CSS)
- **Story Script**: `https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/storyscript/StoryScript-Regular.ttf`
- **Dancing Script**: `https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/dancingscript/DancingScript-Regular.ttf`
- **Great Vibes**: `https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/greatvibes/GreatVibes-Regular.ttf`

Equivalente a usar el enlace de Google Fonts, pero en formato TTF para generar el PDF.

## Lora Bold Italic no se aplica / sigue saliendo Great Vibes

Si el nombre sigue en **script** (Great Vibes) en vez de **Lora Bold Italic**, es que `Lora-BoldItalic.ttf` **no está** en `public/fonts/`. En ese caso ya no se usa otra script: se usa **Helvetica** y en consola verás el aviso.

**Para usar Lora**, añade el archivo a mano:

1. [Lora en Google Fonts](https://fonts.google.com/specimen/Lora) → **Download family**.
2. Descomprime el ZIP. Entra en la carpeta `static/` (si existe) o en la raíz.
3. Copia **`Lora-BoldItalic.ttf`** a `public/fonts/Lora-BoldItalic.ttf`.
4. Vuelve a generar el certificado.

Opcional: `npm run ensure-fonts` intenta descargar Lora; si en tu red falla, usa los pasos de arriba.

## Si la descarga falla (sin internet, etc.)

Puedes descargarlas manualmente desde Google Fonts y colocarlas en `public/fonts/`:

1. [Lora](https://fonts.google.com/specimen/Lora) → **Download family** → descomprime → copia `Lora-BoldItalic.ttf` (en `static/` o raíz) a `public/fonts/`.
2. [Story Script (Guión de la historia)](https://fonts.google.com/specimen/Story+Script) → **Download family** → descomprime → copia `StoryScript-Regular.ttf` a `public/fonts/`.
3. [Dancing Script](https://fonts.google.com/specimen/Dancing+Script) → **Download family** → descomprime → copia `DancingScript-Regular.ttf` a `public/fonts/`.
4. [Great Vibes](https://fonts.google.com/specimen/Great+Vibes) → **Download family** → descomprime → copia `GreatVibes-Regular.ttf` a `public/fonts/`.

## Orden de uso

1. **Lora Bold Italic** (por defecto, si existe) — estilo: font-weight 700, italic
2. **Great Vibes** (si no hay Lora)
3. **Story Script** (si no hay Great Vibes)
4. **Dancing Script** (si no hay Story Script)
5. **Alex Brush** (si tienes `AlexBrush-Regular.ttf`)
6. **Helvetica** (si no hay ninguna TTF)

## Cambiar la fuente por defecto

En `src/modules/certificates/services/pdf.service.ts`, en el constructor:

```ts
this.defaultFont = 'loraBoldItalic';  // o 'greatVibes', 'storyScript', 'dancingScript'
```

También puedes pasar `fontName: 'greatVibes'`, `fontName: 'storyScript'`, etc. en los `metadata` del certificado al generarlo.
