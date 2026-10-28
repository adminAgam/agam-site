# AGAM Administración — Fase 3

Esta versión parte de la Fase 2/2.1 ya conectada a Supabase.

## Mejoras incorporadas
- Optimización automática de JPG/PNG/WEBP a WEBP antes de subir (máx. 5 MB de entrada).
- Redimensionado en navegador para reducir consumo de Storage y acelerar la web.
- Eliminación automática del archivo de Storage al borrar un proyecto/cliente.
- Eliminación del archivo anterior cuando se reemplaza una imagen.
- Confirmación de borrado más explícita.
- Buscador de proyectos y clientes.
- Reordenamiento rápido con flechas ↑ ↓.
- Validación básica de correo y mensajes de error más claros.
- Protección contra doble envío al guardar.
- `cacheControl` largo para imágenes versionadas con UUID.

## Seguridad
Mantener las políticas RLS endurecidas por UID configuradas en Fase 2.1. No publicar `service_role`, `sb_secret_`, contraseña de base de datos ni contraseña del administrador. La `sb_publishable_` del frontend es pública por diseño.

## Pruebas recomendadas antes de GitHub Pages
1. Iniciar sesión en `/admin/`.
2. Crear un proyecto con JPG/PNG y confirmar que se publica como WEBP.
3. Reemplazar su imagen y verificar que la anterior desaparece de Storage.
4. Eliminar el proyecto y verificar que su archivo también desaparece.
5. Reordenar proyectos/clientes.
6. Probar búsquedas.
7. Abrir el sitio público en incógnito y verificar lectura sin autenticación.
