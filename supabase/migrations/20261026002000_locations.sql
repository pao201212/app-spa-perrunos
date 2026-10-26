-- T18 · Locales del spa: configuración, estaciones, horario semanal y días de cierre (SPEC §4, D3, D4, D24).

create extension if not exists btree_gist with schema extensions;

create type public.confirmation_mode as enum ('auto', 'manual');
create type public.capacity_mode as enum ('detailed', 'daily_quota');
create type public.station_type as enum ('bath', 'dry', 'finish');

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address text,
  whatsapp text,
  is_active boolean not null default true,
  -- Reservas web: confirmadas al instante o pendientes de aprobación del admin (D4).
  confirmation_mode public.confirmation_mode not null default 'auto',
  -- El cliente cancela o reprograma hasta N horas antes (Entrega 2).
  cancel_window_hours integer not null default 4 check (cancel_window_hours between 0 and 168),
  max_days_ahead integer not null default 30 check (max_days_ahead between 1 and 365),
  -- Quien baña sigue con el secado de esa mascota (D11).
  bather_continues_drying boolean not null default true,
  slot_step_min integer not null default 15 check (slot_step_min in (5, 10, 15, 20, 30, 60)),
  capacity_mode public.capacity_mode not null default 'detailed',
  created_at timestamptz not null default now(),
  -- Destino de las FKs compuestas: una fila hija nunca apunta a un local de otro spa.
  unique (tenant_id, id)
);

create unique index locations_tenant_name_key on public.locations (tenant_id, lower(name));

create table public.location_stations (
  tenant_id uuid not null,
  location_id uuid not null,
  station public.station_type not null,
  count integer not null check (count between 0 and 50),
  primary key (location_id, station),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade
);

create table public.location_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  location_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  opens_at time not null,
  closes_at time not null,
  check (closes_at > opens_at),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade,
  -- Varios tramos por día (p. ej. 08:00-12:00 y 13:00-17:30), sin solaparse.
  exclude using gist (
    location_id with =,
    weekday with =,
    tsrange('2000-01-01'::date + opens_at, '2000-01-01'::date + closes_at) with &&
  )
);

create index location_hours_location_idx on public.location_hours (location_id, weekday);

create table public.location_closures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  location_id uuid not null,
  date date not null,
  reason text,
  unique (location_id, date),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Visibilidad pública: lo que el cliente necesita para reservar.

create function private.is_location_public(p_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.locations l
    join public.tenants t on t.id = l.tenant_id
    where l.id = p_location_id and l.is_active and t.is_active
  );
$$;

revoke all on function private.is_location_public(uuid) from public;
grant execute on function private.is_location_public(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: lectura pública de locales activos, horarios y cierres; estaciones solo para el staff.
-- Escritura: solo el staff del spa (o el super admin).

alter table public.locations enable row level security;
alter table public.location_stations enable row level security;
alter table public.location_hours enable row level security;
alter table public.location_closures enable row level security;

create policy "locations_select_public_or_staff" on public.locations
  for select to anon, authenticated
  using ((select private.is_location_public(id)) or (select private.is_tenant_staff(tenant_id)));

create policy "location_hours_select_public_or_staff" on public.location_hours
  for select to anon, authenticated
  using ((select private.is_location_public(location_id)) or (select private.is_tenant_staff(tenant_id)));

create policy "location_closures_select_public_or_staff" on public.location_closures
  for select to anon, authenticated
  using ((select private.is_location_public(location_id)) or (select private.is_tenant_staff(tenant_id)));

revoke all on public.location_stations from anon;
create policy "location_stations_select_staff" on public.location_stations
  for select to authenticated
  using ((select private.is_tenant_staff(tenant_id)));

do $$
declare
  t text;
begin
  foreach t in array array['locations', 'location_stations', 'location_hours', 'location_closures'] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_tenant_staff(tenant_id)))',
      t || '_insert_staff', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_tenant_staff(tenant_id))) with check ((select private.is_tenant_staff(tenant_id)))',
      t || '_update_staff', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_tenant_staff(tenant_id)))',
      t || '_delete_staff', t);
  end loop;
end;
$$;
