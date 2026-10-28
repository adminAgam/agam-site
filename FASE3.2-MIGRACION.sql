-- AGAM Ingeniería SAS — Fase 3.2: galería de imágenes por proyecto
-- Ejecutar UNA VEZ en Supabase > SQL Editor.
-- No elimina ni modifica projects.image_url: esa imagen sigue siendo la portada.

begin;

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 1 check (sort_order > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_images_project_order_idx
  on public.project_images(project_id, sort_order);

alter table public.project_images enable row level security;

drop policy if exists "public read active project images" on public.project_images;
create policy "public read active project images"
on public.project_images
for select
to anon
using (
  active = true
  and exists (
    select 1 from public.projects p
    where p.id = project_images.project_id and p.active = true
  )
);

-- Mantiene el mismo administrador autorizado que ya validamos en Fase 2.1.
drop policy if exists "admin project images" on public.project_images;
create policy "admin project images"
on public.project_images
for all
to authenticated
using (auth.uid() = '75916b3f-6c1f-40cb-ba6f-e3476e207332'::uuid)
with check (auth.uid() = '75916b3f-6c1f-40cb-ba6f-e3476e207332'::uuid);

commit;
