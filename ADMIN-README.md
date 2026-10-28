# Manual de Administración — AGAM Ingeniería S.A.S.

**Versión:** Fase 3.4.4  
**Tipo:** Manual operativo para administrador del sitio web

Este manual explica el uso del panel administrativo de AGAM Ingeniería S.A.S. para gestionar proyectos, clientes, galerías y datos de contacto sin modificar directamente el código del sitio web.

---

## 1. Acceso al panel administrativo

Ingrese al panel administrativo mediante:

https://agamingenieria.com/admin/

Utilice únicamente la cuenta administrativa autorizada.

### Recomendaciones de seguridad

- No comparta las credenciales de acceso.
- No guarde contraseñas en archivos públicos.
- No comparta tokens, claves API ni información de Supabase.
- En equipos compartidos, cierre siempre la sesión al terminar.
- Utilice el botón **Cerrar sesión** para finalizar correctamente.

---

## 2. Panel principal

El panel muestra un resumen general de la información administrada, incluyendo proyectos y clientes registrados.

Desde el panel se puede acceder a las principales funciones administrativas.

---

## 3. Administración de proyectos

Desde la sección **Proyectos** puede:

- Crear un proyecto.
- Editar un proyecto existente.
- Modificar título y descripción.
- Cambiar la imagen principal o portada.
- Mostrar u ocultar el proyecto.
- Cambiar el orden de presentación.
- Administrar la galería de fotografías.
- Eliminar un proyecto.

### Visibilidad

**Visible:** el proyecto puede aparecer en el sitio público.

**Oculto:** el proyecto permanece registrado en el sistema, pero no aparece en el sitio público.

Si solamente desea retirar temporalmente un proyecto, se recomienda utilizar **Oculto** en lugar de eliminarlo.

### Orden

Utilice las flechas de orden para cambiar la posición en la que aparecen los proyectos.

---

## 4. Imagen principal de un proyecto

Cada proyecto dispone de una imagen principal o portada.

La portada se administra desde la opción **Editar** del proyecto.

Esta imagen es independiente de las fotografías adicionales de la galería.

---

## 5. Galería de proyectos

Cada proyecto puede tener:

- 1 imagen principal o portada.
- Hasta 10 fotografías adicionales.

Por lo tanto, un proyecto puede presentar hasta 11 imágenes contando la portada.

### Formatos permitidos

- JPG
- PNG
- WEBP

### Tamaño máximo

El tamaño máximo permitido por archivo es de **5 MB**.

Las imágenes cargadas son optimizadas automáticamente a formato WEBP.

### Desde la galería puede

- Agregar fotografías.
- Consultar cuántas fotografías adicionales existen.
- Reordenar fotografías mediante las flechas.
- Eliminar fotografías.

La eliminación de una fotografía requiere confirmación.

---

## 6. Administración de clientes

Desde la sección **Clientes** puede:

- Crear clientes.
- Editar el nombre.
- Cambiar la imagen o logotipo.
- Mostrar u ocultar el cliente.
- Cambiar su posición.
- Eliminar el cliente.

### Recomendación

Si desea retirar temporalmente un cliente del sitio público, utilice **Oculto** en lugar de eliminarlo.

La eliminación permanente requiere confirmación.

---

## 7. Búsqueda

Las secciones de **Proyectos** y **Clientes** disponen de campos de búsqueda.

Puede escribir parte del nombre para localizar rápidamente un registro.

La búsqueda solamente filtra lo que aparece en pantalla y **no modifica ni elimina información**.

---

## 8. Configuración del sitio

Desde la sección **Configuración** se administran los datos públicos de contacto:

- WhatsApp.
- Correo electrónico.
- Teléfono.
- Ubicación.

Después de modificar un dato, seleccione **Guardar cambios**.

Los datos almacenados se utilizan posteriormente en el sitio público.

### Importante

El correo electrónico debe tener un formato válido.

Antes de guardar, revise especialmente el número de WhatsApp, teléfono y correo electrónico.

Después de realizar cambios, verifique el sitio público.

---

## 9. Mantenimiento de imágenes

El panel dispone de una herramienta para buscar archivos huérfanos en el almacenamiento de imágenes.

Un archivo huérfano es una imagen almacenada que ya no está asociada a un proyecto o cliente existente.

### Funcionamiento

Si no existen archivos huérfanos, el sistema informará:

**Storage limpio. No se encontraron imágenes huérfanas.**

Si existen archivos candidatos para eliminación, el sistema solicitará confirmación antes de eliminarlos.

### Precaución

No elimine archivos manualmente desde Supabase Storage salvo que exista una necesidad técnica y se cuente con respaldo.

---

## 10. Eliminación de información

Las operaciones de eliminación son permanentes.

El sistema solicita confirmación antes de realizar las principales operaciones destructivas.

Antes de aceptar una eliminación:

1. Verifique el nombre del proyecto, cliente o fotografía.
2. Confirme que realmente desea eliminarlo.
3. Si solamente desea retirarlo temporalmente del sitio, utilice **Oculto**.

---

## 11. Buenas prácticas de administración

- Verifique la información antes de guardar.
- Utilice imágenes de buena calidad.
- No cargue archivos superiores a 5 MB.
- Utilice nombres claros para proyectos y clientes.
- Revise el sitio público después de cambios importantes.
- Prefiera ocultar antes que eliminar cuando exista duda.
- Cierre la sesión al terminar.
- No comparta las credenciales administrativas.

---

## 12. Elementos que NO debe modificar el administrador

El usuario encargado de administrar contenidos no debe modificar directamente:

- Código HTML.
- Código CSS.
- Código JavaScript.
- Configuración interna de Supabase.
- Políticas RLS.
- Tablas de base de datos.
- Políticas de Storage.
- DNS del dominio.
- Configuración de GitHub Pages.
- Archivos de respaldo.
- Checkpoints técnicos del proyecto.

Estos componentes forman parte de la infraestructura técnica del sitio y deben modificarse únicamente mediante mantenimiento controlado.

---

## 13. Seguridad

El panel administrativo utiliza autenticación para proteger las funciones de gestión.

Las operaciones administrativas requieren una sesión autenticada.

El sitio público únicamente debe disponer de los permisos necesarios para consultar la información autorizada para publicación.

Nunca incluya contraseñas, tokens, claves administrativas o credenciales privadas dentro de archivos públicos del sitio.

---

## 14. Flujo recomendado después de realizar cambios

Después de modificar información:

1. Guarde los cambios.
2. Confirme que el panel muestre la información correcta.
3. Abra el sitio público.
4. Actualice la página.
5. Compruebe que el cambio se vea correctamente.
6. Cierre la sesión administrativa cuando termine.

---

## Estado del sistema

**FASE 3.4.4 — Manual de administración para cliente**

El panel administrativo permite actualmente gestionar de forma operativa:

- Proyectos.
- Portadas.
- Galerías.
- Clientes.
- Visibilidad.
- Orden.
- Datos de contacto.
- Búsqueda.
- Mantenimiento controlado de imágenes.
- Sesiones administrativas.

---

AGAM Ingeniería S.A.S.  
Manual operativo del panel administrativo.