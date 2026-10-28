# AGAM Administración — Fase 3.2

## Objetivo
Galería de múltiples fotografías por proyecto conservando `projects.image_url` como portada.

## Instalación
1. Ejecutar `FASE3.2-MIGRACION.sql` una sola vez en Supabase > SQL Editor.
2. Confirmar `Success. No rows returned`.
3. Servir esta carpeta con `python -m http.server 8000`.
4. Ingresar a `/admin/` y abrir Proyectos > Galería.

## Funciones
- Portada independiente (Editar proyecto).
- Múltiples fotos adicionales por proyecto.
- Conversión automática a WEBP.
- Orden ↑/↓ de fotos.
- Eliminación de foto de DB + Storage.
- Eliminación del proyecto limpia portada y galería.
- Sitio público muestra contador de fotos y galería por proyecto.
- RLS de `project_images`: lectura anónima solo para proyectos/fotos activos; escritura limitada al UID administrativo validado.

## Compatibilidad
No se elimina ni migra `projects.image_url`; los proyectos existentes siguen funcionando sin cambios.
