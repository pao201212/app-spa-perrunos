-- T39 · Reservar (SPEC §4 Seguridad, §5.3, docs/capacidad.md §2): la única forma de crear citas.
-- Repite la evaluación dentro de un candado por local y día, así que dos reservas a la vez por el
-- último cupo no pueden confirmarse ambas (S9). Talla, pelo, cupo y precios quedan congelados.
--
-- p_pets: [{ "pet_id": uuid, "services": [uuid, …], "extras": [uuid, …], "options": [uuid, …] }]
-- Cliente (web): sus propias mascotas; sin sobrecupo; límites anti-abuso del sistema anterior.
-- Staff (admin): indica p_customer_id; con p_overbook crea la cita aunque no haya cupo (queda marcada).
--
-- Errores: P0001 con hint = código (CUPO_LLENO, SIN_ESPACIO, …, LIMITE_RESERVAS, MASCOTA_OCUPADA).

-- Fracciones sin decimales en el detalle (div: división entera exacta de numeric).
create or replace function capacity.reduce_fraction(p_num numeric, p_den numeric)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('num', div(p_num, g), 'den', div(p_den, g))
  from (select greatest(gcd(p_num, p_den), 1) as g) as x;
$$;

-- Motivos que el admin puede pasar por alto con sobrecupo. Precio, duración, cierre y fecha no.
create function capacity.overridable(p_code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code in ('PASADO', 'SIN_EMPLEADOS', 'SIN_CAPACIDAD', 'CUPO_LLENO', 'SIN_ESPACIO', 'FUERA_DE_HORARIO');
$$;

create function capacity.book(
  p_location_id uuid,
  p_starts_at timestamptz,
  p_pets jsonb,
  p_customer_id uuid,
  p_overbook boolean,
  p_notes text
)
returns table (
  id uuid,
  code text,
  status public.appointment_status,
  estimated_ready_at timestamptz,
  total_cop integer,
  overbooked boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loc record;
  v_is_staff boolean;
  v_customer_id uuid;
  v_date date;
  v_request jsonb := '[]';
  v_pet record;
  v_slot record;
  v_day_code text;
  v_options integer;
  v_overbooked boolean := false;
  v_total integer := 0;
  v_group_id uuid;
  v_appointment record;
  v_count integer;
begin
  select l.id, l.tenant_id, l.confirmation_mode, t.timezone
  into v_loc
  from public.locations l join public.tenants t on t.id = l.tenant_id
  where l.id = p_location_id;
  if v_loc.id is null or not private.can_book_at(p_location_id) then
    raise exception 'El local no existe' using errcode = 'P0002';
  end if;
  v_is_staff := private.is_tenant_staff(v_loc.tenant_id);

  if v_is_staff then
    v_customer_id := p_customer_id;
    if not exists (select 1 from public.customers c
                   where c.id = v_customer_id and c.tenant_id = v_loc.tenant_id) then
      raise exception 'Elige un cliente del spa' using errcode = '22023';
    end if;
  else
    if p_overbook then
      raise exception 'Solo el spa puede crear citas con sobrecupo' using errcode = '42501';
    end if;
    select c.id into v_customer_id from public.customers c
    where c.tenant_id = v_loc.tenant_id and c.user_id = (select auth.uid());
    if v_customer_id is null then
      raise exception 'Completa tu perfil antes de reservar' using errcode = '42501';
    end if;
  end if;

  if jsonb_typeof(p_pets) is distinct from 'array' or jsonb_array_length(p_pets) = 0 then
    raise exception 'Elige al menos una mascota' using errcode = '22023';
  end if;
  if (select count(distinct value ->> 'pet_id') from jsonb_array_elements(p_pets)) <> jsonb_array_length(p_pets) then
    raise exception 'Cada mascota va una sola vez' using errcode = '22023';
  end if;

  -- Anti-abuso (clientes): máximo 5 reservas en 5 minutos y 10 citas activas.
  if not v_is_staff then
    select count(*) into v_count from public.appointments a
    where a.customer_id = v_customer_id and a.created_at > now() - interval '5 minutes';
    if v_count >= 5 then
      raise exception 'Hiciste muchas reservas seguidas. Espera unos minutos.'
        using errcode = 'P0001', hint = 'LIMITE_RESERVAS';
    end if;
    select count(*) into v_count from public.appointments a
    where a.customer_id = v_customer_id
      and a.status in ('pending', 'scheduled', 'received', 'in_progress', 'ready')
      and a.starts_at >= now();
    if v_count >= 10 then
      raise exception 'Ya tienes 10 citas activas' using errcode = 'P0001', hint = 'LIMITE_RESERVAS';
    end if;
  end if;

  -- Mascotas del cliente, con talla y pelo actuales (se congelan en la cita).
  for v_pet in
    select p.id, p.species, p.size, p.coat, p.is_active, p.customer_id, x.value as request
    from jsonb_array_elements(p_pets) as x
    left join public.pets p on p.id = (x.value ->> 'pet_id')::uuid
  loop
    if v_pet.id is null or v_pet.customer_id <> v_customer_id or not v_pet.is_active then
      raise exception 'La mascota no es del cliente' using errcode = '22023';
    end if;
    v_request := v_request || jsonb_build_object(
      'species', v_pet.species, 'size', v_pet.size, 'coat', v_pet.coat,
      'services', coalesce(v_pet.request -> 'services', '[]'),
      'extras', coalesce(v_pet.request -> 'extras', '[]'));
  end loop;

  v_date := (p_starts_at at time zone v_loc.timezone)::date;
  -- Candado por local y día: las reservas del mismo día se evalúan una tras otra.
  perform pg_advisory_xact_lock(hashtextextended(p_location_id::text || v_date::text, 0));

  select e.* into v_slot from capacity.evaluate(p_location_id, v_date, v_request) e
  where e.starts_at = p_starts_at;
  if v_slot.starts_at is null then
    -- No es una hora del horario (o el local no abre ese día).
    select e.code into v_day_code from capacity.evaluate(p_location_id, v_date, v_request) e
    where e.starts_at is null;
    raise exception 'Ese horario no está disponible'
      using errcode = 'P0001', hint = coalesce(v_day_code, 'HORA_INVALIDA');
  end if;
  if v_slot.code is not null then
    if not (v_is_staff and p_overbook and capacity.overridable(v_slot.code)) then
      raise exception '%', case when v_slot.code in ('CUPO_LLENO', 'SIN_ESPACIO')
                                then 'Ese horario acaba de ocuparse'
                                else 'Ese horario no está disponible' end
        using errcode = 'P0001', hint = v_slot.code, detail = coalesce(v_slot.detail::text, '');
    end if;
    v_overbooked := true;
  end if;

  -- Una mascota no puede estar en dos citas a la vez.
  if exists (
    select 1 from public.appointment_pets ap
    join public.appointments a on a.id = ap.appointment_id
    where ap.pet_id in (select (value ->> 'pet_id')::uuid from jsonb_array_elements(p_pets))
      and a.status not in ('cancelled', 'no_show', 'delivered')
      and tstzrange(a.starts_at, a.estimated_ready_at) && tstzrange(p_starts_at, v_slot.estimated_ready_at)
  ) then
    raise exception 'Esa mascota ya tiene una cita a esa hora'
      using errcode = 'P0001', hint = 'MASCOTA_OCUPADA';
  end if;

  -- Mascotas que vienen juntas: si todas son de un mismo grupo, la cita queda ligada a él.
  if jsonb_array_length(p_pets) > 1 then
    select min(m.group_id::text)::uuid into v_group_id
    from public.pet_group_members m
    where m.pet_id in (select (value ->> 'pet_id')::uuid from jsonb_array_elements(p_pets))
    having count(*) = jsonb_array_length(p_pets) and count(distinct m.group_id) = 1;
  end if;

  insert into public.appointments (
    tenant_id, location_id, customer_id, pet_group_id, status, starts_at, estimated_ready_at,
    total_cop, source, overbooked, notes, created_by)
  values (
    v_loc.tenant_id, p_location_id, v_customer_id, v_group_id,
    (case when v_is_staff or v_loc.confirmation_mode = 'auto' then 'scheduled' else 'pending' end)::public.appointment_status,
    p_starts_at, v_slot.estimated_ready_at, 0,
    (case when v_is_staff then 'admin' else 'web' end)::public.appointment_source,
    v_overbooked, nullif(trim(p_notes), ''), (select auth.uid()))
  returning * into v_appointment;

  insert into public.appointment_pets (tenant_id, appointment_id, pet_id, species, size, coat, quota_divisor)
  select v_loc.tenant_id, v_appointment.id, p.id, p.species, p.size, p.coat,
         case when exists (select 1 from public.services s
                           where s.id in (select jsonb_array_elements_text(x.value -> 'services')::uuid)
                             and s.kind = 'bath')
              then (select c.pets_per_staff from public.location_pet_capacity c
                    where c.location_id = p_location_id and c.species = p.species
                      and c.size = p.size and c.coat = p.coat)
         end
  from jsonb_array_elements(p_pets) as x
  join public.pets p on p.id = (x.value ->> 'pet_id')::uuid;

  -- Servicios y adicionales con su precio del local; opcionales sin costo de los servicios elegidos.
  insert into public.appointment_items (tenant_id, appointment_id, pet_id, item_type, service_id, extra_id, option_id, name, price_cop)
  select v_loc.tenant_id, v_appointment.id, ap.pet_id, 'service'::public.appointment_item_type, s.id, null::uuid, null::uuid, s.name, pr.price_cop
  from public.appointment_pets ap
  cross join lateral jsonb_array_elements(p_pets) as x
  join public.services s on s.id in (select jsonb_array_elements_text(x.value -> 'services')::uuid)
  join public.location_service_prices pr
    on pr.location_id = p_location_id and pr.service_id = s.id and pr.size = ap.size and pr.coat = ap.coat
  where ap.appointment_id = v_appointment.id and (x.value ->> 'pet_id')::uuid = ap.pet_id
  union all
  select v_loc.tenant_id, v_appointment.id, ap.pet_id, 'extra'::public.appointment_item_type, null::uuid, e.id, null::uuid, e.name, pr.price_cop
  from public.appointment_pets ap
  cross join lateral jsonb_array_elements(p_pets) as x
  join public.extras e on e.id in (select jsonb_array_elements_text(coalesce(x.value -> 'extras', '[]'))::uuid)
  join public.location_extra_prices pr
    on pr.location_id = p_location_id and pr.extra_id = e.id and pr.size = ap.size and pr.coat = ap.coat
  where ap.appointment_id = v_appointment.id and (x.value ->> 'pet_id')::uuid = ap.pet_id;

  select count(*) into v_options
  from jsonb_array_elements(p_pets) as x,
       jsonb_array_elements_text(coalesce(x.value -> 'options', '[]')) as o;
  insert into public.appointment_items (tenant_id, appointment_id, pet_id, item_type, service_id, extra_id, option_id, name, price_cop)
  select v_loc.tenant_id, v_appointment.id, (x.value ->> 'pet_id')::uuid, 'option'::public.appointment_item_type, null, null, so.id, so.name, 0
  from jsonb_array_elements(p_pets) as x
  join public.service_options so
    on so.id in (select jsonb_array_elements_text(coalesce(x.value -> 'options', '[]'))::uuid)
   and so.is_active
   and so.service_id in (select jsonb_array_elements_text(x.value -> 'services')::uuid);
  get diagnostics v_count = row_count;
  if v_count <> v_options then
    raise exception 'Hay opcionales que no corresponden a los servicios elegidos' using errcode = '22023';
  end if;

  select coalesce(sum(i.price_cop), 0) into v_total
  from public.appointment_items i where i.appointment_id = v_appointment.id;
  update public.appointments a set total_cop = v_total where a.id = v_appointment.id;

  return query select v_appointment.id, v_appointment.code, v_appointment.status,
                      v_appointment.estimated_ready_at, v_total, v_overbooked;
end;
$$;

revoke all on function capacity.overridable(text) from public;
revoke all on function capacity.book(uuid, timestamptz, jsonb, uuid, boolean, text) from public;

create function public.book_appointment(
  p_location_id uuid,
  p_starts_at timestamptz,
  p_pets jsonb,
  p_customer_id uuid default null,
  p_overbook boolean default false,
  p_notes text default null
)
returns table (
  id uuid,
  code text,
  status public.appointment_status,
  estimated_ready_at timestamptz,
  total_cop integer,
  overbooked boolean
)
language sql
security definer
set search_path = ''
as $$
  select * from capacity.book(p_location_id, p_starts_at, p_pets, p_customer_id, p_overbook, p_notes);
$$;

revoke all on function public.book_appointment(uuid, timestamptz, jsonb, uuid, boolean, text) from public, anon;
grant execute on function public.book_appointment(uuid, timestamptz, jsonb, uuid, boolean, text) to authenticated;
