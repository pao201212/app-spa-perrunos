-- T23 · Personal del spa: habilidades, turnos semanales por local y ausencias (D5).
-- Los empleados no tienen usuario en la v1. Información interna: solo la ve el staff del spa.

create type public.staff_skill as enum ('bath', 'dry', 'finish', 'special_cut');

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index staff_tenant_name_key on public.staff (tenant_id, lower(name));

create table public.staff_skills (
  tenant_id uuid not null,
  staff_id uuid not null,
  skill public.staff_skill not null,
  primary key (staff_id, skill),
  foreign key (tenant_id, staff_id) references public.staff (tenant_id, id) on delete cascade
);

create table public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  staff_id uuid not null,
  location_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  starts_at time not null,
  ends_at time not null,
  check (ends_at > starts_at),
  foreign key (tenant_id, staff_id) references public.staff (tenant_id, id) on delete cascade,
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade,
  -- Una persona no puede estar en dos turnos a la vez, aunque sean en locales distintos.
  exclude using gist (
    staff_id with =,
    weekday with =,
    tsrange('2000-01-01'::date + starts_at, '2000-01-01'::date + ends_at) with &&
  )
);

create index staff_shifts_location_idx on public.staff_shifts (location_id, weekday);

create table public.staff_absences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  staff_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at),
  foreign key (tenant_id, staff_id) references public.staff (tenant_id, id) on delete cascade
);

create index staff_absences_staff_idx on public.staff_absences (staff_id, starts_at);

-- RLS: todo interno del spa.
do $$
declare
  t text;
begin
  foreach t in array array['staff', 'staff_skills', 'staff_shifts', 'staff_absences'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_tenant_staff(tenant_id)))',
      t || '_select_staff', t);
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
