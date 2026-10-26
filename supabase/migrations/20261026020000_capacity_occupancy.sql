-- T40 · Ocupación por día de la capacidad simple (SPEC §5.3): Usado / Jornadas, también por talla.
-- Solo para el staff del spa. Usa las mismas piezas que capacity.evaluate.

create function capacity.occupancy(p_location_id uuid, p_from date, p_to date)
returns table (
  day date,
  closed boolean,
  jornadas jsonb,
  used jsonb,
  percent integer,
  by_size jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_day date;
  v_open tstzmultirange;
  v_open_min integer;
  v_work_sum integer;
  v_divisors integer[];
  v_divisor integer;
  v_lcm numeric;
  v_used numeric;
begin
  select t.timezone into v_tz
  from public.locations l join public.tenants t on t.id = l.tenant_id
  where l.id = p_location_id;
  if p_to < p_from or p_to - p_from > 62 then
    raise exception 'Elige un rango de hasta 2 meses' using errcode = '22023';
  end if;

  for v_day in select d::date from generate_series(p_from, p_to, interval '1 day') as d loop
    v_open := capacity.open_hours(p_location_id, v_day);
    v_open_min := capacity.minutes(v_open);
    select coalesce(sum(least(v_open_min, capacity.minutes(w.work))), 0) into v_work_sum
    from capacity.bath_staff_work(p_location_id, v_day) w;

    select coalesce(array_agg(ap.quota_divisor), '{}') into v_divisors
    from public.appointments a
    join public.appointment_pets ap on ap.appointment_id = a.id
    where a.location_id = p_location_id
      and a.status not in ('cancelled', 'no_show')
      and (a.starts_at at time zone v_tz)::date = v_day
      and ap.quota_divisor is not null;
    v_lcm := 1;
    foreach v_divisor in array v_divisors loop
      v_lcm := lcm(v_lcm, v_divisor);
    end loop;
    select coalesce(sum(v_lcm / d), 0) into v_used from unnest(v_divisors) as d;

    return query
      select v_day,
             isempty(v_open),
             case when v_open_min > 0 then capacity.reduce_fraction(v_work_sum, v_open_min) end,
             capacity.reduce_fraction(v_used, v_lcm),
             case when v_work_sum > 0
                  then round(v_used * v_open_min * 100 / (v_work_sum * v_lcm))::integer end,
             coalesce((
               select jsonb_agg(jsonb_build_object('size', s.size, 'pets', s.pets) order by s.size)
               from (
                 select ap.size, count(*)::integer as pets
                 from public.appointments a
                 join public.appointment_pets ap on ap.appointment_id = a.id
                 where a.location_id = p_location_id
                   and a.status not in ('cancelled', 'no_show')
                   and (a.starts_at at time zone v_tz)::date = v_day
                   and ap.quota_divisor is not null
                 group by ap.size
               ) as s
             ), '[]');
  end loop;
end;
$$;

revoke all on function capacity.occupancy(uuid, date, date) from public;

create function public.location_occupancy(p_location_id uuid, p_from date, p_to date)
returns table (
  day date,
  closed boolean,
  jornadas jsonb,
  used jsonb,
  percent integer,
  by_size jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.locations l
    where l.id = p_location_id and private.is_tenant_staff(l.tenant_id)
  ) then
    raise exception 'No puedes administrar este local' using errcode = '42501';
  end if;
  return query select * from capacity.occupancy(p_location_id, p_from, p_to);
end;
$$;

revoke all on function public.location_occupancy(uuid, date, date) from public, anon;
grant execute on function public.location_occupancy(uuid, date, date) to authenticated;
