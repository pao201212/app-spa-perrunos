-- T37 · Capacidad simple: horas disponibles con entrega aproximada (SPEC §5.3, docs/capacidad.md §3).
-- La fuente de verdad es este schema: la UI no replica reglas. capacity.* no se expone por la API;
-- se llama a través de public.available_slots (y luego explain y book), que validan el acceso.
--
-- p_pets: [{ "species": "dog", "size": "M", "coat": "short",
--            "services": [uuid, …], "extras": [uuid, …] }, …]   -- mascotas que vienen juntas

create schema capacity;
revoke all on schema capacity from public;

-- Minutos totales de un multirango.
create function capacity.minutes(p_ranges tstzmultirange)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(extract(epoch from upper(r) - lower(r)) / 60), 0)::integer
  from unnest(p_ranges) as r;
$$;

-- Horario del local ese día (vacío si no abre o está marcado como cierre).
create function capacity.open_hours(p_location_id uuid, p_date date)
returns tstzmultirange
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    range_agg(tstzrange((p_date + h.opens_at) at time zone t.timezone,
                        (p_date + h.closes_at) at time zone t.timezone)),
    '{}'::tstzmultirange)
  from public.locations l
  join public.tenants t on t.id = l.tenant_id
  join public.location_hours h on h.location_id = l.id and h.weekday = extract(dow from p_date)
  where l.id = p_location_id
    and not exists (
      select 1 from public.location_closures c where c.location_id = l.id and c.date = p_date
    );
$$;

-- Tiempo de trabajo de cada empleado que baña ese día en el local: turno ∩ horario − ausencias
-- (D32). El almuerzo queda fuera porque el local no abre.
create function capacity.bath_staff_work(p_location_id uuid, p_date date)
returns table (staff_id uuid, work tstzmultirange)
language sql
stable
security definer
set search_path = ''
as $$
  with open as (
    select capacity.open_hours(p_location_id, p_date) as hours
  ), shifts as (
    select s.id as staff_id,
           range_agg(tstzrange((p_date + sh.starts_at) at time zone t.timezone,
                               (p_date + sh.ends_at) at time zone t.timezone)) as shift
    from public.staff s
    join public.tenants t on t.id = s.tenant_id
    join public.staff_shifts sh
      on sh.staff_id = s.id and sh.location_id = p_location_id
     and sh.weekday = extract(dow from p_date)
    where s.is_active
      and exists (select 1 from public.staff_skills k where k.staff_id = s.id and k.skill = 'bath')
    group by s.id
  )
  select sh.staff_id,
         (sh.shift * open.hours) - coalesce(
           (select range_agg(tstzrange(a.starts_at, a.ends_at))
            from public.staff_absences a where a.staff_id = sh.staff_id),
           '{}'::tstzmultirange)
  from shifts sh cross join open;
$$;

-- Suma p_minutes de trabajo desde p_start saltando los cierres entre tramos (D29).
-- fits = false si no alcanza antes del cierre; ready_at es entonces la entrega "virtual".
create function capacity.add_open_minutes(p_hours tstzmultirange, p_start timestamptz, p_minutes integer)
returns table (ready_at timestamptz, fits boolean)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_range tstzrange;
  v_from timestamptz;
  v_left interval := make_interval(mins => p_minutes);
  v_last timestamptz := p_start;
begin
  for v_range in select r from unnest(p_hours) as r order by lower(r) loop
    continue when upper(v_range) <= p_start;
    v_from := greatest(lower(v_range), p_start);
    if v_from + v_left <= upper(v_range) then
      return query select v_from + v_left, true;
      return;
    end if;
    v_left := v_left - (upper(v_range) - v_from);
    v_last := upper(v_range);
  end loop;
  return query select v_last + v_left, false;
end;
$$;

create function capacity.reduce_fraction(p_num numeric, p_den numeric)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('num', p_num / g, 'den', p_den / g)
  from (select greatest(gcd(p_num, p_den), 1) as g) as x;
$$;

/**
 * Evalúa cada hora candidata del día. code null = disponible; si no, el motivo y su detalle
 * (docs/capacidad.md §2 y §3.4). Si el local no abre ese día, devuelve una sola fila CERRADO.
 * p_exclude_appointment: la cita que se está reprogramando no cuenta contra sí misma.
 */
create function capacity.evaluate(
  p_location_id uuid,
  p_date date,
  p_pets jsonb,
  p_exclude_appointment uuid default null
)
returns table (starts_at timestamptz, estimated_ready_at timestamptz, code text, detail jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_loc record;
  v_open tstzmultirange;
  v_open_min integer;
  v_today date;
  v_pet record;
  v_service record;
  v_extra record;
  v_minutes integer;
  v_service_minutes integer;
  v_pet_has_bath boolean;
  v_duration integer := 0;
  v_bath_pets integer := 0;
  v_new_divisors integer[] := '{}';
  v_used_divisors integer[];
  v_divisor integer;
  v_lcm numeric := 1;
  v_used numeric := 0;
  v_needed numeric := 0;
  v_work_sum integer := 0;
  v_staff_work tstzmultirange[];
  v_work tstzmultirange;
  v_stays tstzrange[];
  v_seats integer;
  v_day_code text;
  v_day_detail jsonb;
  v_range tstzrange;
  v_t timestamptz;
  v_ready record;
  v_point timestamptz;
  v_present integer;
  v_staff_now integer;
  v_slot_code text;
  v_slot_detail jsonb;
begin
  select l.id, l.tenant_id, l.is_active, l.max_days_ahead, l.slot_step_min, t.timezone
  into v_loc
  from public.locations l join public.tenants t on t.id = l.tenant_id
  where l.id = p_location_id;
  if v_loc.id is null then
    raise exception 'El local no existe' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_pets) is distinct from 'array' or jsonb_array_length(p_pets) = 0 then
    raise exception 'Indica al menos una mascota' using errcode = '22023';
  end if;

  v_today := (now() at time zone v_loc.timezone)::date;
  if p_date > v_today + v_loc.max_days_ahead then
    v_day_code := 'MUY_LEJOS';
    v_day_detail := jsonb_build_object('max_date', v_today + v_loc.max_days_ahead);
  end if;

  v_open := case when v_loc.is_active then capacity.open_hours(p_location_id, p_date)
                 else '{}'::tstzmultirange end;
  if isempty(v_open) then
    return query select null::timestamptz, null::timestamptz, coalesce(v_day_code, 'CERRADO'),
      coalesce(v_day_detail, jsonb_build_object(
        'reason', (select c.reason from public.location_closures c
                   where c.location_id = p_location_id and c.date = p_date)));
    return;
  end if;
  v_open_min := capacity.minutes(v_open);

  -- Mascotas: duración, precio, y cupo que usa cada una.
  for v_pet in
    select p.ordinality::integer as n,
           (p.value ->> 'species')::public.pet_species as species,
           (p.value ->> 'size')::public.pet_size as size,
           (p.value ->> 'coat')::public.coat_type as coat,
           array(select jsonb_array_elements_text(coalesce(p.value -> 'services', '[]')))::uuid[] as services,
           array(select jsonb_array_elements_text(coalesce(p.value -> 'extras', '[]')))::uuid[] as extras
    from jsonb_array_elements(p_pets) with ordinality as p
  loop
    if cardinality(v_pet.services) = 0 then
      raise exception 'Elige al menos un servicio por mascota' using errcode = '22023';
    end if;
    v_minutes := 0;
    v_pet_has_bath := false;
    for v_service in
      select s.id, s.name, s.kind, s.species, s.is_active,
             d.bath_min, d.dry_min, d.details_min, d.cut_min,
             exists (select 1 from public.location_service_prices pr
                     where pr.location_id = p_location_id and pr.service_id = s.id
                       and pr.size = v_pet.size and pr.coat = v_pet.coat) as priced
      from public.services s
      left join public.service_durations d
        on d.service_id = s.id and d.size = v_pet.size and d.coat = v_pet.coat
      where s.id = any (v_pet.services) and s.tenant_id = v_loc.tenant_id
    loop
      if not v_service.is_active or v_service.species not in ('both', v_pet.species::text::public.service_species) then
        raise exception 'El servicio % no está disponible para esta mascota', v_service.name
          using errcode = '22023';
      end if;
      if not v_service.priced then
        v_day_code := coalesce(v_day_code, 'SIN_PRECIO');
        v_day_detail := coalesce(v_day_detail, jsonb_build_object('pet', v_pet.n, 'service', v_service.name));
      end if;
      v_service_minutes := case v_service.kind
        when 'bath' then v_service.bath_min + v_service.dry_min + v_service.details_min
        when 'special_cut' then v_service.cut_min
        else v_service.details_min end;
      if v_service_minutes is null then
        v_day_code := coalesce(v_day_code, 'SIN_DURACION');
        v_day_detail := coalesce(v_day_detail, jsonb_build_object('pet', v_pet.n, 'service', v_service.name));
      end if;
      v_minutes := v_minutes + coalesce(v_service_minutes, 0);
      -- Baño + corte especial cuenta como un baño de su talla (S15).
      if v_service.kind = 'bath' and not v_pet_has_bath then
        v_pet_has_bath := true;
        v_bath_pets := v_bath_pets + 1;
        select c.pets_per_staff into v_divisor
        from public.location_pet_capacity c
        where c.location_id = p_location_id and c.species = v_pet.species
          and c.size = v_pet.size and c.coat = v_pet.coat;
        if v_divisor is null then
          v_day_code := coalesce(v_day_code, 'SIN_CAPACIDAD');
          v_day_detail := coalesce(v_day_detail, jsonb_build_object(
            'pet', v_pet.n, 'species', v_pet.species, 'size', v_pet.size, 'coat', v_pet.coat));
        else
          v_new_divisors := v_new_divisors || v_divisor;
        end if;
      end if;
    end loop;
    if (select count(*) from public.services s
        where s.id = any (v_pet.services) and s.tenant_id = v_loc.tenant_id) <> cardinality(v_pet.services) then
      raise exception 'Servicio desconocido' using errcode = '22023';
    end if;

    for v_extra in
      select e.name, e.extra_minutes,
             e.is_active and e.service_id = any (v_pet.services) as valid,
             exists (select 1 from public.location_extra_prices pr
                     where pr.location_id = p_location_id and pr.extra_id = e.id
                       and pr.size = v_pet.size and pr.coat = v_pet.coat) as priced
      from public.extras e
      where e.id = any (v_pet.extras) and e.tenant_id = v_loc.tenant_id
    loop
      if not v_extra.valid then
        raise exception 'El adicional % no corresponde a los servicios elegidos', v_extra.name
          using errcode = '22023';
      end if;
      if not v_extra.priced then
        v_day_code := coalesce(v_day_code, 'SIN_PRECIO');
        v_day_detail := coalesce(v_day_detail, jsonb_build_object('pet', v_pet.n, 'extra', v_extra.name));
      end if;
      v_minutes := v_minutes + v_extra.extra_minutes;
    end loop;
    if (select count(*) from public.extras e
        where e.id = any (v_pet.extras) and e.tenant_id = v_loc.tenant_id) <> cardinality(v_pet.extras) then
      raise exception 'Adicional desconocido' using errcode = '22023';
    end if;

    -- Las mascotas que vienen juntas se atienden a la par: entrega = la más larga (aprox.).
    v_duration := greatest(v_duration, v_minutes);
  end loop;

  -- Cupo del día (D31, D32): Σ 1/N de lo reservado + lo nuevo ≤ jornadas. Aritmética exacta.
  if v_bath_pets > 0 then
    select coalesce(array_agg(w.work), '{}'),
           coalesce(sum(least(v_open_min, capacity.minutes(w.work))), 0)
    into v_staff_work, v_work_sum
    from capacity.bath_staff_work(p_location_id, p_date) w;

    select coalesce(array_agg(ap.quota_divisor), '{}') into v_used_divisors
    from public.appointments a
    join public.appointment_pets ap on ap.appointment_id = a.id
    where a.location_id = p_location_id
      and a.status not in ('cancelled', 'no_show')
      and (a.starts_at at time zone v_loc.timezone)::date = p_date
      and ap.quota_divisor is not null
      and a.id is distinct from p_exclude_appointment;

    foreach v_divisor in array v_used_divisors || v_new_divisors loop
      v_lcm := lcm(v_lcm, v_divisor);
    end loop;
    select coalesce(sum(v_lcm / d), 0) into v_used from unnest(v_used_divisors) as d;
    select coalesce(sum(v_lcm / d), 0) into v_needed from unnest(v_new_divisors) as d;

    if v_work_sum = 0 then
      v_day_code := coalesce(v_day_code, 'SIN_EMPLEADOS');
    elsif v_day_code is null and (v_used + v_needed) * v_open_min > v_work_sum * v_lcm then
      v_day_code := 'CUPO_LLENO';
      v_day_detail := jsonb_build_object(
        'jornadas', capacity.reduce_fraction(v_work_sum, v_open_min),
        'remaining', capacity.reduce_fraction(
          greatest(v_work_sum * v_lcm - v_used * v_open_min, 0), v_open_min * v_lcm),
        'needed', capacity.reduce_fraction(v_needed, v_lcm));
    end if;

    -- Estadías de las mascotas ya reservadas (una por mascota con baño).
    select coalesce(array_agg(tstzrange(a.starts_at, a.estimated_ready_at)), '{}') into v_stays
    from public.appointments a
    join public.appointment_pets ap on ap.appointment_id = a.id
    where a.location_id = p_location_id
      and a.status not in ('cancelled', 'no_show', 'delivered')
      and ap.quota_divisor is not null
      and a.id is distinct from p_exclude_appointment
      and tstzrange(a.starts_at, a.estimated_ready_at) && tstzrange(lower(v_open), upper(v_open));

    select coalesce(sum(z.seats), 0)::integer into v_seats
    from public.location_waiting_zones z where z.location_id = p_location_id;
  end if;

  for v_range in select r from unnest(v_open) as r order by lower(r) loop
    v_t := lower(v_range);
    while v_t < upper(v_range) loop
      select * into v_ready from capacity.add_open_minutes(v_open, v_t, v_duration);
      v_slot_code := null;
      v_slot_detail := null;

      if v_t < now() then
        v_slot_code := 'PASADO';
      elsif v_day_code is not null then
        v_slot_code := v_day_code;
        v_slot_detail := v_day_detail;
      elsif not v_ready.fits then
        v_slot_code := 'FUERA_DE_HORARIO';
        v_slot_detail := jsonb_build_object('ready_at', v_ready.ready_at, 'closes_at', upper(v_open));
      elsif v_bath_pets > 0 then
        -- Espacio (D33): a ninguna hora de la estadía más mascotas que empleados en turno + puestos.
        -- Los conteos solo cambian en los bordes, así que basta revisar esos instantes.
        for v_point in
          select p from (
            select v_t as p
            union select lower(s) from unnest(v_stays) as s
            union select upper(s) from unnest(v_stays) as s
            union select lower(r) from unnest(v_staff_work) as w, unnest(w) as r
            union select upper(r) from unnest(v_staff_work) as w, unnest(w) as r
          ) as points
          where p >= v_t and p < v_ready.ready_at
          order by p
        loop
          select count(*) into v_present from unnest(v_stays) as s where s @> v_point;
          v_staff_now := 0;
          foreach v_work in array v_staff_work loop
            if v_work @> v_point then
              v_staff_now := v_staff_now + 1;
            end if;
          end loop;
          if v_present + v_bath_pets > v_staff_now + v_seats then
            v_slot_code := 'SIN_ESPACIO';
            v_slot_detail := jsonb_build_object(
              'at', v_point, 'present', v_present, 'max', v_staff_now + v_seats);
            exit;
          end if;
        end loop;
      end if;

      return query select v_t, v_ready.ready_at, v_slot_code, v_slot_detail;
      v_t := v_t + make_interval(mins => v_loc.slot_step_min);
    end loop;
  end loop;
end;
$$;

revoke all on all functions in schema capacity from public;

-- ---------------------------------------------------------------------------
-- API

create function private.can_book_at(p_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_location_public(p_location_id)
      or exists (select 1 from public.locations l
                 where l.id = p_location_id and private.is_tenant_staff(l.tenant_id));
$$;

revoke all on function private.can_book_at(uuid) from public;
grant execute on function private.can_book_at(uuid) to authenticated, service_role;

-- Horas disponibles del día con su entrega aproximada (S10).
create function public.available_slots(p_location_id uuid, p_date date, p_pets jsonb)
returns table (starts_at timestamptz, estimated_ready_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_book_at(p_location_id) then
    raise exception 'El local no existe' using errcode = 'P0002';
  end if;
  return query
    select e.starts_at, e.estimated_ready_at
    from capacity.evaluate(p_location_id, p_date, p_pets) e
    where e.code is null
    order by e.starts_at;
end;
$$;

revoke all on function public.available_slots(uuid, date, jsonb) from public, anon;
grant execute on function public.available_slots(uuid, date, jsonb) to authenticated;
