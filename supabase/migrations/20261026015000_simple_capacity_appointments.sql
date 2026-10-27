-- T35 · Capacidad simple y citas (SPEC §4, §5.3, D28–D33).
--   capacity_mode: 'simple' (la única activa en la Entrega 1) | 'advanced' (Próximamente).
--   location_pet_capacity: cuántas mascotas atiende UN empleado al día, por especie × talla × pelo.
--   location_waiting_zones: dónde esperan las mascotas; limita cuántas hay a la vez en el local.
--   appointments (+ pets, items): las crea solo capacity.book (T39); aquí no hay insert por API.
-- Los segmentos por estación y persona llegan con la capacidad avanzada.

alter type public.capacity_mode rename value 'detailed' to 'advanced';
alter type public.capacity_mode rename value 'daily_quota' to 'simple';
alter table public.locations alter column capacity_mode set default 'simple';
update public.locations set capacity_mode = 'simple';

create table public.location_pet_capacity (
  tenant_id uuid not null,
  location_id uuid not null,
  species public.pet_species not null,
  size public.pet_size not null,
  coat public.coat_type not null,
  -- Sin fila para una combinación: ese local no la recibe (SIN_CAPACIDAD).
  pets_per_staff integer not null check (pets_per_staff between 1 and 100),
  primary key (location_id, species, size, coat),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade
);

create table public.location_waiting_zones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  location_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  seats integer not null check (seats between 1 and 100),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade
);

create unique index location_waiting_zones_name_key
  on public.location_waiting_zones (location_id, lower(name));

-- ---------------------------------------------------------------------------
-- Citas. Las FKs a local, mascota y catálogo no permiten borrar lo que ya tiene citas
-- (se desactiva); al borrar el spa, todo cae en cascada.

create type public.appointment_status as enum (
  'pending', 'scheduled', 'received', 'in_progress', 'ready', 'delivered', 'cancelled', 'no_show'
);
create type public.appointment_source as enum ('web', 'admin');
create type public.appointment_item_type as enum ('service', 'extra', 'option');

-- Código corto para hablar de la cita por WhatsApp (sin 0/O ni 1/I).
create function private.new_appointment_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  location_id uuid not null,
  customer_id uuid not null,
  pet_group_id uuid,
  code text not null default private.new_appointment_code(),
  status public.appointment_status not null,
  starts_at timestamptz not null,
  -- Entrega aproximada (D29); el admin puede ajustarla.
  estimated_ready_at timestamptz not null,
  total_cop integer not null check (total_cop >= 0), -- congelado al reservar
  source public.appointment_source not null,
  overbooked boolean not null default false,
  client_confirmed_at timestamptz,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (estimated_ready_at > starts_at),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id),
  foreign key (tenant_id, customer_id) references public.customers (tenant_id, id) on delete cascade,
  foreign key (tenant_id, pet_group_id) references public.pet_groups (tenant_id, id) on delete set null (pet_group_id)
);

create index appointments_location_starts_idx on public.appointments (location_id, starts_at);
create index appointments_customer_idx on public.appointments (customer_id, starts_at desc);

-- Talla, pelo y cupo congelados: cambiar la mascota o la capacidad no altera citas ya tomadas.
create table public.appointment_pets (
  tenant_id uuid not null,
  appointment_id uuid not null,
  pet_id uuid not null,
  species public.pet_species not null,
  size public.pet_size not null,
  coat public.coat_type not null,
  -- pets_per_staff al reservar: la mascota usa 1/N de jornada. null = sin baño (no usa cupo).
  quota_divisor integer check (quota_divisor between 1 and 100),
  primary key (appointment_id, pet_id),
  unique (tenant_id, appointment_id, pet_id),
  foreign key (tenant_id, appointment_id) references public.appointments (tenant_id, id) on delete cascade,
  foreign key (tenant_id, pet_id) references public.pets (tenant_id, id)
);

create index appointment_pets_pet_idx on public.appointment_pets (pet_id);

create table public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  pet_id uuid not null,
  item_type public.appointment_item_type not null,
  service_id uuid,
  extra_id uuid,
  option_id uuid,
  name text not null, -- congelado
  price_cop integer not null check (price_cop >= 0),
  check (
    case item_type
      when 'service' then service_id is not null and extra_id is null and option_id is null
      when 'extra' then extra_id is not null and service_id is null and option_id is null
      when 'option' then option_id is not null and service_id is null and extra_id is null and price_cop = 0
    end
  ),
  foreign key (tenant_id, appointment_id, pet_id)
    references public.appointment_pets (tenant_id, appointment_id, pet_id) on delete cascade,
  foreign key (tenant_id, service_id) references public.services (tenant_id, id),
  foreign key (tenant_id, extra_id) references public.extras (tenant_id, id),
  foreign key (tenant_id, option_id) references public.service_options (tenant_id, id)
);

create index appointment_items_appointment_idx on public.appointment_items (appointment_id);

create function private.is_own_appointment(p_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.appointments a
    join public.customers c on c.id = a.customer_id
    where a.id = p_appointment_id and c.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_own_appointment(uuid) from public;
grant execute on function private.is_own_appointment(uuid) to authenticated, service_role;
revoke all on function private.new_appointment_code() from public;
grant execute on function private.new_appointment_code() to service_role;

-- ---------------------------------------------------------------------------
-- RLS. Capacidad y zonas: configuración interna del staff (el cálculo va por capacity.*).
-- Citas: el staff las ve y actualiza; el cliente ve las suyas. Nadie las inserta por la API.

do $$
declare
  t text;
begin
  foreach t in array array[
    'location_pet_capacity', 'location_waiting_zones',
    'appointments', 'appointment_pets', 'appointment_items'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;

  foreach t in array array['location_pet_capacity', 'location_waiting_zones'] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_tenant_staff(tenant_id))) with check ((select private.is_tenant_staff(tenant_id)))',
      t || '_all_staff', t);
  end loop;

  foreach t in array array['appointments', 'appointment_pets', 'appointment_items'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_tenant_staff(tenant_id)))',
      t || '_select_staff', t);
  end loop;
end;
$$;

-- Sin políticas de insert ni delete: insertar falla y borrar no afecta filas (se cancela).
-- El staff cambia estado, entrega y notas; el resto de la cita queda congelado.
create function private.guard_appointment_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.tenant_id, new.location_id, new.customer_id, new.pet_group_id, new.code,
          new.starts_at, new.total_cop, new.source, new.overbooked, new.created_by, new.created_at)
         is distinct from
         (old.tenant_id, old.location_id, old.customer_id, old.pet_group_id, old.code,
          old.starts_at, old.total_cop, old.source, old.overbooked, old.created_by, old.created_at) then
    raise exception 'Solo se puede cambiar el estado, la entrega y las notas de la cita'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger appointments_guard_changes
  before update on public.appointments
  for each row execute function private.guard_appointment_changes();

create policy "appointments_update_staff" on public.appointments
  for update to authenticated
  using ((select private.is_tenant_staff(tenant_id)))
  with check ((select private.is_tenant_staff(tenant_id)));

create policy "appointments_select_own" on public.appointments
  for select to authenticated using ((select private.is_own_customer(customer_id)));
create policy "appointment_pets_select_own" on public.appointment_pets
  for select to authenticated using ((select private.is_own_appointment(appointment_id)));
create policy "appointment_items_select_own" on public.appointment_items
  for select to authenticated using ((select private.is_own_appointment(appointment_id)));
