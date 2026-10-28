# AGAM — Fase 2: backend seguro y panel administrador

Esta versión incorpora autenticación real, base de datos y subida de imágenes usando Supabase. GitHub Pages continúa alojando el frontend.

## 1. Crear el proyecto de Supabase
1. Cree un proyecto nuevo en Supabase.
2. Abra **SQL Editor**, pegue todo el archivo `supabase-setup.sql` y ejecútelo.
3. En **Authentication > Users**, cree el usuario administrador con correo y contraseña. No habilite registro público de usuarios para este sitio.

## 2. Conectar el sitio
En **Project Settings / API** copie:
- Project URL
- `anon` / publishable key

Edite `config.js` y reemplace los dos textos `PEGA_AQUI_...`.

**No coloque `service_role` en GitHub.** La clave anon/publishable sí es una clave de frontend; las políticas RLS son las que restringen las operaciones.

## 3. Cargar contenido inicial
Entre a `/admin/` con el usuario creado y agregue proyectos/clientes. Los registros de la Fase 1 no se migran automáticamente para evitar publicar datos de prueba. La configuración general sí parte de los valores actuales.

## 4. Publicar en GitHub Pages
Suba el contenido de esta carpeta al repositorio. El sitio público leerá proyectos/clientes desde Supabase y `/admin/` exigirá autenticación.

## Seguridad aplicada
- No existe contraseña hardcodeada en JavaScript.
- RLS habilitado en todas las tablas.
- Visitantes anónimos solo pueden leer contenido público.
- Escritura requiere sesión autenticada.
- Storage limita imágenes a JPG/PNG/WEBP y 5 MB.
- El panel incluye `noindex,nofollow`.

## Prueba mínima antes de conectar el dominio
1. Abrir la web pública.
2. Abrir `/admin/` sin sesión: debe mostrar login.
3. Iniciar sesión.
4. Crear un proyecto y subir una imagen.
5. Actualizar la web pública y comprobar que aparece.
6. Cerrar sesión y confirmar que ya no se puede editar.
