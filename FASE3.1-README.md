# AGAM Administración — Fase 3.1

## Cambios
- Normalización automática de `sort_order` en proyectos y clientes a 1..N.
- Los nuevos registros reciben el siguiente orden disponible.
- Los controles ↑/↓ reescriben un orden consecutivo y estable.
- Herramienta de mantenimiento en Configuración para detectar y eliminar imágenes huérfanas.
- La limpieza solo considera `projects/` y `clients/` del bucket configurado y compara cada ruta contra `image_url` de la base de datos antes de eliminar.
- Se conserva la optimización WEBP y la limpieza al reemplazar/eliminar registros.

## Prueba recomendada
1. Iniciar el sitio local y entrar a `/admin/`.
2. Abrir Proyectos: los órdenes deben quedar 1, 2, 3... sin duplicados.
3. Ir a Configuración > Mantenimiento > Buscar y limpiar archivos huérfanos.
4. Revisar la lista de confirmación antes de aceptar.
5. Confirmar en Supabase Storage que solo permanecen archivos referenciados.

No requiere SQL adicional.
