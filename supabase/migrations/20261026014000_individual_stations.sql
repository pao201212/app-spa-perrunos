-- D27 (2026-10-26, validado con Spa Perrunos y Gatunos)
--   Solo hay dos tipos de estación: tina (baño) y mesa (secado y detalles). Cada estación se
--   registra una por una. El corte especial se hace en la misma mesa de los detalles: la mesa indica
--   si también sirve para corte especial.

create type public.station_kind as enum ('tub', 'table');

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  location_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  kind public.station_kind not null,
  for_special_cut boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (kind = 'table' or not for_special_cut),
  unique (tenant_id, id),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade
);

create unique index stations_location_name_key on public.stations (location_id, lower(name));
create index stations_location_idx on public.stations (location_id, kind);

-- Conversión de los conteos: bath → Tina N; las mesas son tantas como el mayor entre secado y
-- corte, y las primeras (tantas como estaciones de corte había) sirven también para corte.
insert into public.stations (tenant_id, location_id, name, kind, sort_order)
select ls.tenant_id, ls.location_id, 'Tina ' || n, 'tub', n
from public.location_stations ls
cross join generate_series(1, ls.count) as n
where ls.station = 'bath';

insert into public.stations (tenant_id, location_id, name, kind, for_special_cut, sort_order)
select l.tenant_id, l.location_id, 'Mesa ' || n, 'table', n <= l.cut, n
from (
  select tenant_id, location_id,
         coalesce(max(count) filter (where station = 'dry'), 0) as dry,
         coalesce(max(count) filter (where station = 'cut'), 0) as cut
  from public.location_stations
  group by tenant_id, location_id
) l
cross join generate_series(1, greatest(l.dry, l.cut)) as n;

drop table public.location_stations;
drop type public.station_type;

alter table public.stations enable row level security;

revoke all on public.stations from anon;
create policy "stations_select_staff" on public.stations
  for select to authenticated using ((select private.is_tenant_staff(tenant_id)));
create policy "stations_insert_staff" on public.stations
  for insert to authenticated with check ((select private.is_tenant_staff(tenant_id)));
create policy "stations_update_staff" on public.stations
  for update to authenticated
  using ((select private.is_tenant_staff(tenant_id)))
  with check ((select private.is_tenant_staff(tenant_id)));
create policy "stations_delete_staff" on public.stations
  for delete to authenticated using ((select private.is_tenant_staff(tenant_id)));

-- "Aplicar a todos los locales": la sección stations ahora copia la lista de estaciones.
create or replace function public.apply_location_settings(p_source_location_id uuid, p_sections text[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source public.locations;
  v_targets uuid[];
begin
  if p_sections is null or cardinality(p_sections) = 0
     or not (p_sections <@ array['booking', 'stations', 'hours', 'closures']) then
    raise exception 'Sección desconocida: usa booking, stations, hours o closures' using errcode = '22023';
  end if;

  select * into v_source from public.locations where id = p_source_location_id;
  -- Los locales activos son públicos: además de verlo, hay que ser staff de su spa.
  if v_source.id is null or not private.is_tenant_staff(v_source.tenant_id) then
    raise exception 'No puedes administrar este local' using errcode = '42501';
  end if;

  select coalesce(array_agg(id), '{}') into v_targets
  from public.locations
  where tenant_id = v_source.tenant_id and id <> v_source.id;

  if 'booking' = any (p_sections) then
    update public.locations
    set confirmation_mode = v_source.confirmation_mode,
        cancel_window_hours = v_source.cancel_window_hours,
        max_days_ahead = v_source.max_days_ahead,
        slot_step_min = v_source.slot_step_min,
        bather_continues_drying = v_source.bather_continues_drying,
        capacity_mode = v_source.capacity_mode
    where id = any (v_targets);
  end if;

  if 'stations' = any (p_sections) then
    delete from public.stations where location_id = any (v_targets);
    insert into public.stations (tenant_id, location_id, name, kind, for_special_cut, sort_order)
    select v_source.tenant_id, t.id, s.name, s.kind, s.for_special_cut, s.sort_order
    from public.stations s
    cross join unnest(v_targets) as t (id)
    where s.location_id = v_source.id;
  end if;

  if 'hours' = any (p_sections) then
    delete from public.location_hours where location_id = any (v_targets);
    insert into public.location_hours (tenant_id, location_id, weekday, opens_at, closes_at)
    select v_source.tenant_id, t.id, h.weekday, h.opens_at, h.closes_at
    from public.location_hours h
    cross join unnest(v_targets) as t (id)
    where h.location_id = v_source.id;
  end if;

  if 'closures' = any (p_sections) then
    insert into public.location_closures (tenant_id, location_id, date, reason)
    select v_source.tenant_id, t.id, c.date, c.reason
    from public.location_closures c
    cross join unnest(v_targets) as t (id)
    where c.location_id = v_source.id
    on conflict (location_id, date) do nothing;
  end if;

  return cardinality(v_targets);
end;
$$;
