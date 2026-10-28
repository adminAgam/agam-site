# Panel administrativo AGAM — Fase 1

## Incluido
- Sitio público ahora carga clientes y proyectos dinámicamente.
- `/admin/` permite crear, editar, ocultar y eliminar proyectos/clientes.
- Configuración de WhatsApp, correo, teléfonos y ubicación.
- Modo de prueba usa `localStorage`, por lo que no expone contraseñas ni pretende ser autenticación de producción.

## Antes de publicar `/admin/` en producción
Conectar autenticación, base de datos y almacenamiento de imágenes (recomendado: Supabase). Nunca poner una contraseña administrativa fija ni una service-role key dentro de JavaScript/GitHub Pages.

## Próxima fase
1. Crear proyecto Supabase.
2. Tablas `projects`, `clients`, `site_settings`.
3. Bucket de imágenes.
4. Auth por email para administrador.
5. RLS para que el público solo lea y administradores autorizados escriban.
6. Sustituir el adaptador local por Supabase y activar carga real de imágenes.
