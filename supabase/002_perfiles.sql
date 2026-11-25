-- ============================================================================
-- PARKIT · Migración 002: Perfiles (datos personales + moto) y comprobantes
-- Ejecuta este script en Supabase → SQL Editor (después de schema.sql).
-- ============================================================================

create table if not exists public.perfiles (
  usuario_id text primary key,
  rol text not null check (rol in ('student', 'visitor')),
  email text,
  nombre_completo text not null,
  tipo_documento text not null check (tipo_documento in ('CC', 'TI', 'CE', 'PAS')),
  numero_documento text not null,
  celular text not null,
  placa text not null,
  marca text not null,
  modelo text,
  color text not null,
  relacion_vehiculo text not null check (relacion_vehiculo in ('propia', 'familiar', 'prestada')),
  comprobante_propiedad text,
  comprobante_soat text,
  foto_moto text,
  estado_verificacion text not null default 'pendiente'
    check (estado_verificacion in ('pendiente', 'verificado', 'rechazado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists perfiles_placa_idx on public.perfiles (placa);

alter table public.perfiles enable row level security;

drop policy if exists "Leer perfiles demo" on public.perfiles;
create policy "Leer perfiles demo" on public.perfiles for select using (true);

drop policy if exists "Crear perfiles demo" on public.perfiles;
create policy "Crear perfiles demo" on public.perfiles for insert with check (true);

drop policy if exists "Editar perfiles demo" on public.perfiles;
create policy "Editar perfiles demo" on public.perfiles for update using (true) with check (true);

-- Bucket privado para comprobantes (tarjeta de propiedad, SOAT, foto de la moto)
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "Subir comprobantes" on storage.objects;
create policy "Subir comprobantes" on storage.objects
  for insert with check (bucket_id = 'comprobantes');

drop policy if exists "Reemplazar comprobantes" on storage.objects;
create policy "Reemplazar comprobantes" on storage.objects
  for update using (bucket_id = 'comprobantes') with check (bucket_id = 'comprobantes');
