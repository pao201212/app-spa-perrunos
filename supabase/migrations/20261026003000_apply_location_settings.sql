-- T20 · "Aplicar a todos los locales" (D4): copia la configuración de un local a los demás del spa.
-- Una sola transacción: se aplica a todos o a ninguno.
-- SECURITY INVOKER: corre con los permisos de quien llama, así RLS limita todo a su propio spa.
--
-- Secciones:
--   booking  → ajustes de reserva (reemplaza)
--   stations → estaciones por tipo (reemplaza)
--   hours    → horario semanal (reemplaza)
--   closures → días de cierre (suma; conserva los cierres propios de cada local)

create function public.apply_location_settings(p_source_location_id uuid, p_sections text[])
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
    delete from public.location_stations where location_id = any (v_targets);
    insert into public.location_stations (tenant_id, location_id, station, count)
    select v_source.tenant_id, t.id, s.station, s.count
    from public.location_stations s
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

revoke all on function public.apply_location_settings(uuid, text[]) from public, anon;
grant execute on function public.apply_location_settings(uuid, text[]) to authenticated;
