-- ============================================================================
-- PARKIT · Esquema SQL para Supabase (PostgreSQL + Realtime)
-- Universidad de Córdoba · Campus Central, Montería
-- Pega este script completo en el SQL Editor de Supabase y presiona Run.
-- ============================================================================

-- 1. Tabla de Zonas
create table if not exists public.zonas (
  id text primary key check (id in ('A', 'B', 'C', 'D')),
  nombre text not null,
  walk_min int not null,
  park_min int not null,
  metros int not null
);

-- 2. Tabla de Cupos (3 estados: libre, apartado, ocupado)
create table if not exists public.cupos (
  id text primary key,
  zona_id text not null references public.zonas(id) on delete cascade,
  subbloque text not null,
  sombra boolean not null default true,
  estado text not null default 'libre' check (estado in ('libre', 'apartado', 'ocupado')),
  reservado_hasta timestamptz,
  usuario_id text,
  placa text,
  updated_at timestamptz not null default now()
);

-- 3. Tabla de Reportes Comunitarios
create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  zona_id text not null references public.zonas(id) on delete cascade,
  estado_reportado text not null check (estado_reportado in ('libre', 'pocos', 'lleno')),
  hay_sombra boolean not null default true,
  usuario_id text,
  creado_en timestamptz not null default now()
);

-- 4. Tabla de 10 Correos Institucionales Autorizados (Demo / Prueba OTP)
create table if not exists public.estudiantes_autorizados (
  email text primary key,
  nombre text not null,
  programa text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Función para liberar automáticamente cupos 'apartado' expirados
create or replace function public.liberar_cupos_expirados()
returns void
language sql
security definer
as $$
  update public.cupos
  set estado = 'libre',
      reservado_hasta = null,
      usuario_id = null,
      placa = null,
      updated_at = now()
  where estado = 'apartado'
    and reservado_hasta is not null
    and reservado_hasta < now();
$$;

-- 6. Habilitar Row Level Security (RLS) con políticas abiertas para la demo
alter table public.zonas enable row level security;
alter table public.cupos enable row level security;
alter table public.reportes enable row level security;
alter table public.estudiantes_autorizados enable row level security;

drop policy if exists "Lectura publica zonas" on public.zonas;
create policy "Lectura publica zonas" on public.zonas for select using (true);

drop policy if exists "Lectura publica cupos" on public.cupos;
create policy "Lectura publica cupos" on public.cupos for select using (true);

drop policy if exists "Actualizacion cupos demo" on public.cupos;
create policy "Actualizacion cupos demo" on public.cupos for update using (true) with check (true);

drop policy if exists "Lectura reportes" on public.reportes;
create policy "Lectura reportes" on public.reportes for select using (true);

drop policy if exists "Insertar reportes" on public.reportes;
create policy "Insertar reportes" on public.reportes for insert with check (true);

drop policy if exists "Verificar correo autorizado" on public.estudiantes_autorizados;
create policy "Verificar correo autorizado" on public.estudiantes_autorizados for select using (true);

-- 7. Habilitar Realtime en cupos y reportes
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cupos'
  ) then
    alter publication supabase_realtime add table public.cupos;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reportes'
  ) then
    alter publication supabase_realtime add table public.reportes;
  end if;
end $$;

-- 8. Semilla inicial de Zonas
insert into public.zonas (id, nombre, walk_min, park_min, metros) values
  ('A', 'Informática', 3, 2, 45),
  ('B', 'Agronomía', 5, 1, 60),
  ('C', 'Postgrados', 6, 3, 90),
  ('D', 'Bioclimático', 4, 4, 75)
on conflict (id) do nothing;

-- 9. Semilla inicial de los 48 Cupos (A-01..D-12)
insert into public.cupos (id, zona_id, subbloque, sombra, estado) values
  -- Zona A · Informática
  ('A-01', 'A', 'A1', true,  'libre'),
  ('A-02', 'A', 'A1', true,  'libre'),
  ('A-03', 'A', 'A1', true,  'ocupado'),
  ('A-04', 'A', 'A1', true,  'ocupado'),
  ('A-05', 'A', 'A2', true,  'ocupado'),
  ('A-06', 'A', 'A2', true,  'libre'),
  ('A-07', 'A', 'A2', true,  'libre'),
  ('A-08', 'A', 'A2', true,  'ocupado'),
  ('A-09', 'A', 'A3', false, 'libre'),
  ('A-10', 'A', 'A3', false, 'libre'),
  ('A-11', 'A', 'A3', false, 'ocupado'),
  ('A-12', 'A', 'A3', false, 'libre'),
  -- Zona B · Agronomía
  ('B-01', 'B', 'B1', true,  'ocupado'),
  ('B-02', 'B', 'B1', true,  'ocupado'),
  ('B-03', 'B', 'B1', true,  'ocupado'),
  ('B-04', 'B', 'B1', true,  'libre'),
  ('B-05', 'B', 'B2', true,  'ocupado'),
  ('B-06', 'B', 'B2', true,  'ocupado'),
  ('B-07', 'B', 'B2', true,  'libre'),
  ('B-08', 'B', 'B2', true,  'ocupado'),
  ('B-09', 'B', 'B3', false, 'ocupado'),
  ('B-10', 'B', 'B3', false, 'libre'),
  ('B-11', 'B', 'B3', false, 'ocupado'),
  ('B-12', 'B', 'B3', false, 'ocupado'),
  -- Zona C · Postgrados
  ('C-01', 'C', 'C1', true,  'ocupado'),
  ('C-02', 'C', 'C1', true,  'ocupado'),
  ('C-03', 'C', 'C1', true,  'ocupado'),
  ('C-04', 'C', 'C1', true,  'ocupado'),
  ('C-05', 'C', 'C2', true,  'ocupado'),
  ('C-06', 'C', 'C2', true,  'ocupado'),
  ('C-07', 'C', 'C2', true,  'ocupado'),
  ('C-08', 'C', 'C2', true,  'ocupado'),
  ('C-09', 'C', 'C3', false, 'ocupado'),
  ('C-10', 'C', 'C3', false, 'ocupado'),
  ('C-11', 'C', 'C3', false, 'ocupado'),
  ('C-12', 'C', 'C3', false, 'ocupado'),
  -- Zona D · Bioclimático
  ('D-01', 'D', 'D1', true,  'libre'),
  ('D-02', 'D', 'D1', true,  'ocupado'),
  ('D-03', 'D', 'D1', true,  'libre'),
  ('D-04', 'D', 'D1', true,  'libre'),
  ('D-05', 'D', 'D2', true,  'ocupado'),
  ('D-06', 'D', 'D2', true,  'libre'),
  ('D-07', 'D', 'D2', true,  'libre'),
  ('D-08', 'D', 'D2', true,  'libre'),
  ('D-09', 'D', 'D3', false, 'ocupado'),
  ('D-10', 'D', 'D3', false, 'libre'),
  ('D-11', 'D', 'D3', false, 'libre'),
  ('D-12', 'D', 'D3', false, 'libre')
on conflict (id) do nothing;

-- 10. Semilla de 10 correos institucionales de prueba (@correo.unicordoba.edu.co)
-- Reemplaza o agrega los correos reales de tus compañeros/profesor para la demo.
insert into public.estudiantes_autorizados (email, nombre, programa) values
  ('estudiante1@correo.unicordoba.edu.co', 'Carlos Martínez', 'Ingeniería de Sistemas'),
  ('estudiante2@correo.unicordoba.edu.co', 'Laura Gómez', 'Ingeniería de Sistemas'),
  ('estudiante3@correo.unicordoba.edu.co', 'Andrés Pérez', 'Ingeniería Agronómica'),
  ('estudiante4@correo.unicordoba.edu.co', 'María Rodríguez', 'Licenciatura en Informática'),
  ('estudiante5@correo.unicordoba.edu.co', 'Juan Díaz', 'Ingeniería Ambiental'),
  ('estudiante6@correo.unicordoba.edu.co', 'Sofía Torres', 'Ingeniería Industrial'),
  ('estudiante7@correo.unicordoba.edu.co  ', 'Mateo López', 'Ingeniería Mecánica'),
  ('estudiante8@correo.unicordoba.edu.co', 'Valentina Castro', 'Administración en Finanzas'),
  ('estudiante9@correo.unicordoba.edu.co', 'David Hernández', 'Ingeniería de Sistemas'),
  ('docente.demo@correo.unicordoba.edu.co', 'Docente Evaluador', 'Facultad de Ingenierías')
on conflict (email) do nothing;
