-- AGAM Ingeniería SAS - Backend Fase 2
-- Ejecutar una sola vez en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), title text not null,
  description text not null default '', image_url text not null,
  sort_order integer not null default 1, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), name text not null,
  image_url text not null, sort_order integer not null default 1,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  id integer primary key check(id=1), whatsapp text default '', email text default '', phones text default '', location text default '', updated_at timestamptz not null default now()
);
insert into public.site_settings(id,whatsapp,email,phones,location) values(1,'573137297652','proyectos@agamingenieria.com','3137297652 • 3107816552','Cajicá, Cundinamarca') on conflict(id) do nothing;

alter table public.projects enable row level security;
alter table public.clients enable row level security;
alter table public.site_settings enable row level security;

-- Público: solo lectura de contenido visible.
drop policy if exists "public read active projects" on public.projects;
create policy "public read active projects" on public.projects for select to anon using(active=true);
drop policy if exists "public read active clients" on public.clients;
create policy "public read active clients" on public.clients for select to anon using(active=true);
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select to anon using(true);

-- Usuarios autenticados del panel: administración. Cree únicamente cuentas de administradores autorizados.
drop policy if exists "admin projects" on public.projects;
create policy "admin projects" on public.projects for all to authenticated using(true) with check(true);
drop policy if exists "admin clients" on public.clients;
create policy "admin clients" on public.clients for all to authenticated using(true) with check(true);
drop policy if exists "admin settings" on public.site_settings;
create policy "admin settings" on public.site_settings for all to authenticated using(true) with check(true);

-- Storage público para imágenes; escritura solo autenticada.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('agam-media','agam-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public view agam media" on storage.objects;
create policy "public view agam media" on storage.objects for select to public using(bucket_id='agam-media');
drop policy if exists "admin upload agam media" on storage.objects;
create policy "admin upload agam media" on storage.objects for insert to authenticated with check(bucket_id='agam-media');
drop policy if exists "admin update agam media" on storage.objects;
create policy "admin update agam media" on storage.objects for update to authenticated using(bucket_id='agam-media') with check(bucket_id='agam-media');
drop policy if exists "admin delete agam media" on storage.objects;
create policy "admin delete agam media" on storage.objects for delete to authenticated using(bucket_id='agam-media');
