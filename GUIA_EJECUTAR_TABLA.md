# 📋 Guía para Ejecutar el Script SQL en pgAdmin

## Paso 1: Abrir pgAdmin

1. Abre **pgAdmin** en tu computadora
2. Si no está abierto, búscalo en el menú de inicio o ejecútalo desde el escritorio

## Paso 2: Conectarte a tu Base de Datos

1. En el panel izquierdo, expande **Servers**
2. Expande tu servidor PostgreSQL (generalmente se llama "PostgreSQL 15" o similar)
3. Expande **Databases**
4. **Haz clic derecho** en la base de datos `movilis_bd`
5. Selecciona **Query Tool** (Herramienta de Consultas)

   > 💡 **Alternativa:** También puedes hacer clic en la base de datos y luego presionar `Alt + Shift + Q`

## Paso 3: Abrir el Script SQL

1. En la ventana de **Query Tool** que se abrió, verás un editor de texto grande
2. Abre el archivo `create_certificados_table.sql` desde tu editor de código (VS Code)
3. **Selecciona TODO el contenido** del archivo (Ctrl + A)
4. **Copia** el contenido (Ctrl + C)
5. **Pega** el contenido en el editor de Query Tool de pgAdmin (Ctrl + V)

## Paso 4: Verificar el Script

Antes de ejecutar, verifica que:
- ✅ El script completo esté pegado en el editor
- ✅ No haya errores de sintaxis visibles
- ✅ Estés conectado a la base de datos correcta (`movilis_bd`)

## Paso 5: Ejecutar el Script

Tienes **3 formas** de ejecutar:

### Opción A: Botón de Ejecutar
1. Haz clic en el botón **▶ Execute/Refresh** (icono de play) en la barra de herramientas
   - O presiona **F5**

### Opción B: Menú
1. Ve a **Query** → **Execute** en el menú superior

### Opción C: Atajo de Teclado
1. Presiona **F5** directamente

## Paso 6: Verificar el Resultado

Después de ejecutar, deberías ver:

### ✅ Si todo salió bien:
- En la pestaña **Messages** (Mensajes) verás:
  ```
  Query returned successfully in X ms
  ```
- En la pestaña **Data Output** verás información sobre las tablas, índices y triggers creados

### ❌ Si hay errores:
- Verás mensajes de error en rojo en la pestaña **Messages**
- Los errores más comunes son:
  - **"relation already exists"**: La tabla ya existe, necesitas eliminarla primero
  - **"column does not exist"**: Falta alguna columna en la tabla `users`
  - **"syntax error"**: Hay un error de sintaxis en el SQL

## Paso 7: Verificar que la Tabla se Creó

1. En el panel izquierdo de pgAdmin:
   - Expande **movilis_bd**
   - Expande **Schemas**
   - Expande **public**
   - Expande **Tables**
2. Deberías ver la tabla **certificados** en la lista
3. Haz clic derecho en **certificados** → **View/Edit Data** → **All Rows** para ver su estructura

## 🔧 Solución de Problemas

### Error: "relation 'certificados' already exists"
**Solución:**
```sql
DROP TABLE IF EXISTS certificados CASCADE;
```
Ejecuta esto primero, luego ejecuta el script completo.

### Error: "relation 'users' does not exist"
**Solución:** 
Primero necesitas crear la tabla `users`. ¿Tienes esa tabla creada?

### Error: "permission denied"
**Solución:**
Asegúrate de estar conectado con un usuario que tenga permisos de administrador.

## ✅ Checklist Final

- [ ] Script ejecutado sin errores
- [ ] Tabla `certificados` visible en el panel izquierdo
- [ ] Puedes ver la estructura de la tabla
- [ ] Los índices se crearon correctamente
- [ ] Los triggers se crearon correctamente

## 🎉 ¡Listo!

Una vez que veas la tabla `certificados` en pgAdmin, significa que todo está configurado correctamente y puedes empezar a usar el sistema de certificados.

