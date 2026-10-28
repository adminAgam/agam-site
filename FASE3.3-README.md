# AGAM Ingeniería S.A.S.
# FASE 3.3 — EXPERIENCIA DE GALERÍA, LIGHTBOX Y ADMINISTRACIÓN

Estado: VALIDADA / ESTABLE
Fecha de cierre: 2026-10-28

---

## 1. OBJETIVO

La Fase 3.3 mejora la experiencia visual y administrativa del sistema de galerías de proyectos implementado previamente en la Fase 3.2.

Esta fase no modifica el modelo de datos de Supabase ni las políticas RLS existentes.

Los principales objetivos fueron:

- mejorar la galería pública responsive;
- implementar un lightbox profesional;
- incorporar navegación mediante teclado;
- incorporar navegación táctil mediante swipe;
- mejorar la administración de fotografías;
- limitar las fotografías adicionales por proyecto;
- mejorar la seguridad del mantenimiento de Storage;
- mantener compatibilidad con la arquitectura existente.

---

# 2. ARQUITECTURA DE GALERÍA

Cada proyecto utiliza dos fuentes de imágenes.

## 2.1 Imagen de portada

La portada continúa almacenándose en:

projects.image_url

Ruta habitual en Storage:

projects/<uuid>.webp

La portada NO pertenece a la tabla project_images.

---

## 2.2 Fotografías adicionales

Las fotografías adicionales se almacenan en:

project_images

Estructura Storage:

projects/<project-id>/gallery/<uuid>.webp

Cada registro contiene la relación con el proyecto mediante:

project_id

y utiliza:

sort_order

para controlar el orden de visualización.

---

## 2.3 Límite establecido

Máximo:

10 fotografías adicionales por proyecto.

La portada es independiente.

Por tanto, un proyecto puede mostrar como máximo:

1 portada + 10 adicionales = 11 fotografías públicas.

---

# 3. FASE 3.3.1 — GALERÍA PÚBLICA RESPONSIVE

Se mejoró la visualización pública de las galerías.

Implementaciones principales:

- modal responsive;
- cuadrícula adaptable;
- fotografías ajustadas a diferentes resoluciones;
- prevención de desbordamiento horizontal;
- comportamiento optimizado para escritorio y móvil;
- conservación de proporciones de imagen.

Bloque CSS identificado mediante:

FASE 3.3.1 - GALERIA PUBLICA RESPONSIVE

La nueva configuración responsive se mantiene después de las reglas anteriores para conservar prioridad CSS.

Estado:

VALIDADO.

---

# 4. FASE 3.3.2 — LIGHTBOX PROFESIONAL

Se implementó un visor ampliado para las fotografías.

Componentes:

- imagen ampliada;
- fondo oscuro;
- botón cerrar;
- flecha anterior;
- flecha siguiente;
- contador de fotografías;
- navegación circular;
- soporte de teclado.

Elementos principales:

zoomPrev
zoomNext
zoomImg
zoomCounter

Funciones principales:

renderZoom()
openZoom()
closeZoom()
showPreviousPhoto()
showNextPhoto()

---

## 4.1 Navegación

El usuario puede utilizar:

Flecha izquierda = fotografía anterior.

Flecha derecha = fotografía siguiente.

La navegación utiliza comportamiento circular.

Ejemplo:

1 / 2 → siguiente → 2 / 2 → siguiente → 1 / 2

---

## 4.2 Tecla ESC

Se implementó cierre jerárquico.

Si el lightbox está abierto:

ESC cierra únicamente el lightbox.

La galería del proyecto permanece abierta.

Validación realizada correctamente.

Estado:

VALIDADO.

---

# 5. FASE 3.3.3 — NAVEGACIÓN TÁCTIL / SWIPE

Se incorporó navegación táctil para dispositivos móviles.

Bloque identificado mediante:

FASE 3.3.3 NAVEGACIÓN TÁCTIL / SWIPE

Eventos utilizados:

touchstart
touchmove
touchend
touchcancel

Parámetros principales:

SWIPE_MIN_DISTANCE = 50

SWIPE_VERTICAL_TOLERANCE = 70

Comportamiento:

Swipe izquierda = fotografía siguiente.

Swipe derecha = fotografía anterior.

Los movimientos predominantemente verticales son ignorados para evitar interferencia con el desplazamiento normal de la página.

La función solamente se activa cuando:

- el lightbox está abierto;
- existen más de una fotografía;
- existe un gesto táctil válido.

Estado:

VALIDADO.

Checkpoint:

app.FASE3_3_3_OK.js

---

# 6. FASE 3.3.4 — ADMINISTRACIÓN PROFESIONAL DE GALERÍAS

Se rediseñó el modal administrativo de fotografías.

Mejoras:

- diseño responsive;
- contador visible;
- información del número de fotografías;
- indicación de cupos disponibles;
- interfaz de carga mejorada;
- tarjetas individuales;
- indicador "Foto X de N";
- controles de orden;
- eliminación;
- límite de fotografías;
- prevención de cargas superiores al límite.

---

## 6.1 Contador

Formato:

X / 10 adicionales

Ejemplo:

1 / 10 adicionales

El contador cambia visualmente cuando se alcanza el máximo permitido.

---

## 6.2 Reordenamiento

Cada fotografía dispone de:

↑ subir posición

↓ bajar posición

La primera fotografía deshabilita ↑.

La última fotografía deshabilita ↓.

El cambio actualiza:

project_images.sort_order

La modificación fue validada correctamente.

---

## 6.3 Eliminación

La eliminación de una fotografía adicional realiza:

1. eliminación del registro project_images;
2. eliminación del archivo correspondiente en Supabase Storage;
3. recarga de información;
4. actualización inmediata de la galería administrativa.

Prueba realizada correctamente.

---

## 6.4 Límite de fotografías

Constante:

MAX_GALLERY_IMAGES = 10

El sistema valida el límite:

- al seleccionar archivos;
- antes de comenzar la carga.

Si un proyecto tiene:

1 fotografía adicional

quedan:

9 cupos.

Prueba realizada:

Se seleccionaron simultáneamente 10 imágenes locales.

Resultado:

La operación fue bloqueada antes de realizar la carga.

Mensaje validado:

"Puedes agregar máximo 9 fotografía(s) más. Seleccionaste 10."

El selector fue limpiado automáticamente.

Ninguna de las imágenes de prueba fue enviada a Supabase.

Estado:

VALIDADO.

---

# 7. CORRECCIÓN DEL ESCÁNER DE ARCHIVOS HUÉRFANOS

Durante las pruebas de Fase 3.3.4 se identificó una incompatibilidad entre el antiguo mantenimiento de Storage y la estructura de galerías introducida en Fase 3.2.

El antiguo código ejecutaba list() únicamente sobre:

projects/

clients/

y asumía que todos los elementos encontrados eran archivos.

Con las galerías existen rutas anidadas:

projects/<project-id>/gallery/

Supabase puede devolver estos prefijos/carpetas durante list().

Esto provocó que una carpeta pudiera aparecer incorrectamente como archivo huérfano.

Ejemplo detectado:

projects/b61b95b4-8197-436f-9e55-deade3e82460

NO se autorizó su eliminación.

---

## 7.1 Solución implementada

Se reemplazó el escaneo simple por:

ESCANEO RECURSIVO SEGURO DE STORAGE

La nueva función:

listAllFiles(folder)

recorre recursivamente las carpetas.

Comportamiento:

- archivo real con id → se agrega al inventario;
- carpeta/prefijo sin id → se recorre;
- carpeta → nunca se propone directamente para eliminación.

El escáner ahora puede recorrer:

projects/
projects/<project-id>/
projects/<project-id>/gallery/
clients/

---

## 7.2 Comparación contra referencias activas

scanOrphans() construye un conjunto de archivos utilizados desde:

projects.image_url

clients.image_url

project_images.image_url

Posteriormente compara los archivos reales existentes en Storage contra esas referencias.

Solo los archivos reales sin referencia pueden ser candidatos a eliminación.

---

## 7.3 Validación

Después de implementar el escaneo recursivo se ejecutó:

Buscar y limpiar archivos huérfanos

Resultado:

"Storage limpio. No se encontraron imágenes huérfanas."

Esto confirmó que la ruta detectada anteriormente correspondía a la estructura anidada y no debía ser tratada como archivo huérfano.

Estado:

VALIDADO.

---

# 8. PRUEBA DE REGRESIÓN PÚBLICA

Proyecto utilizado:

Proyecto prueba2 AGAM

Estado durante la prueba:

1 portada
+
1 fotografía adicional

Total público:

2 fotos

La tarjeta pública mostró correctamente:

2 fotos

La galería mostró correctamente ambas imágenes.

---

## 8.1 Lightbox

Validaciones:

- apertura correcta;
- contador 1 / 2;
- navegación a 2 / 2;
- navegación anterior;
- navegación siguiente;
- proporción de imagen correcta;
- fondo oscuro correcto;
- controles visibles;
- sin scroll horizontal.

---

## 8.2 ESC

Prueba:

Lightbox abierto → ESC

Resultado:

Se cerró únicamente el lightbox oscuro.

La galería blanca del proyecto permaneció abierta.

Resultado:

PASS.

---

# 9. CHECKPOINTS

Checkpoints relevantes creados durante Fase 3.3:

## Público

app.FASE3_3_2_OK.js

app.FASE3_3_3_OK.js

---

## Administrador — previo a 3.3.4

admin/admin.FASE3_3_PRE_ADMIN_OK.js

admin/index.FASE3_3_PRE_ADMIN_OK.html

admin/admin.FASE3_3_PRE_ADMIN_OK.css

---

## Administrador — galería validada

admin/admin.FASE3_3_4_GALLERY_OK.js

---

## Administrador — Storage validado

admin/admin.FASE3_3_4_STORAGE_OK.js

---

## Administrador — versión final 3.3.4

admin/admin.FASE3_3_4_OK.js

admin/index.FASE3_3_4_OK.html

admin/admin.FASE3_3_4_OK.css

---

# 10. ARCHIVOS OPERATIVOS

Los archivos operativos continúan siendo:

Public:

index.html
styles.css
app.js

Administrador:

admin/index.html
admin/admin.css
admin/admin.js

Los archivos *_OK.* son checkpoints y NO deben utilizarse directamente como archivos operativos salvo recuperación controlada.

---

# 11. SUPABASE

No se realizaron cambios de esquema durante Fase 3.3.

Se mantienen:

projects
clients
site_settings
project_images

Bucket:

agam-media

No se modificaron:

- RLS;
- políticas de Storage;
- autenticación;
- estructura de tablas;
- claves;
- configuración del proyecto Supabase.

---

# 12. ESTADO DE SEGURIDAD

Se mantiene:

- autenticación administrativa mediante Supabase Auth;
- signups deshabilitados;
- operaciones administrativas protegidas;
- Storage público únicamente para lectura necesaria del sitio;
- carga/modificación/eliminación restringida al administrador;
- ausencia de service_role key en navegador;
- eliminación controlada de medios;
- escaneo seguro y recursivo de huérfanos.

---

# 13. ESTADO FINAL FASE 3.3

3.3.1 Galería pública responsive:

PASS

3.3.2 Lightbox profesional:

PASS

3.3.3 Navegación táctil / swipe:

PASS

3.3.4 Administración de galería:

PASS

Límite de 10 adicionales:

PASS

Reordenamiento:

PASS

Eliminación:

PASS

Storage recursivo:

PASS

Regresión pública:

PASS

Lightbox:

PASS

ESC jerárquico:

PASS

---

# 14. REGLA PARA SIGUIENTES FASES

Antes de modificar cualquiera de los siguientes archivos:

app.js
styles.css
index.html
admin/admin.js
admin/admin.css
admin/index.html

se debe crear un nuevo checkpoint.

No modificar los checkpoints *_OK.*.

No modificar políticas RLS o Storage sin una fase específica de seguridad y pruebas.

No utilizar service_role en código cliente.

No eliminar manualmente carpetas o archivos de Storage sin comprobar previamente sus referencias en base de datos.

---

FASE 3.3 = CLOSED / STABLE