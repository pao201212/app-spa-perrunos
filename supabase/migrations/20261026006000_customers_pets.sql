-- T25 · Clientes, mascotas y grupos "se bañan juntas" (D9, D10, D13, D20, D23, S6).
-- Datos personales: el staff ve los de su spa; cada cliente solo lo suyo. Nada es público.

create type public.pet_gender as enum ('female', 'male');

-- ---------------------------------------------------------------------------
-- Clientes (un perfil por spa: la misma cuenta Google puede ser cliente de varios spas, S6)

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- null mientras el cliente no haya ingresado (inscrito por el admin, D13).
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  whatsapp text,
  email text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index customers_tenant_user_key on public.customers (tenant_id, user_id) where user_id is not null;
create unique index customers_tenant_email_key on public.customers (tenant_id, email) where email is not null;
create unique index customers_tenant_whatsapp_key on public.customers (tenant_id, whatsapp) where whatsapp is not null;

create function private.is_own_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.customers where id = p_customer_id and user_id = (select auth.uid())
  );
$$;

-- Correo normalizado; un cliente no puede cambiar su usuario, su correo ni su spa.
create function private.guard_customer_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  if tg_op = 'UPDATE'
     and current_user in ('anon', 'authenticated')
     and not private.is_tenant_staff(old.tenant_id) then
    new.user_id := old.user_id;
    new.email := old.email;
    new.tenant_id := old.tenant_id;
  end if;
  return new;
end;
$$;

create trigger customers_guard_changes
  before insert or update on public.customers
  for each row execute function private.guard_customer_changes();

-- Perfil del cliente que ingresa al spa: lo vincula si el admin ya lo inscribió con su correo,
-- o lo crea. El correo sale de la cuenta autenticada, nunca del formulario.
create function public.ensure_customer_profile(p_tenant_id uuid, p_full_name text, p_whatsapp text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_customer_id uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;
  if not private.is_tenant_public(p_tenant_id) then
    raise exception 'El spa no existe' using errcode = 'P0002';
  end if;

  select lower(email) into v_email from auth.users where id = v_user_id;

  select id into v_customer_id from public.customers
  where tenant_id = p_tenant_id and user_id = v_user_id;
  if v_customer_id is not null then
    return v_customer_id;
  end if;

  if v_email is not null then
    update public.customers set user_id = v_user_id
    where tenant_id = p_tenant_id and email = v_email and user_id is null
    returning id into v_customer_id;
    if v_customer_id is not null then
      return v_customer_id;
    end if;
  end if;

  insert into public.customers (tenant_id, user_id, full_name, whatsapp, email)
  values (p_tenant_id, v_user_id, trim(p_full_name), nullif(trim(p_whatsapp), ''), v_email)
  returning id into v_customer_id;
  return v_customer_id;
exception
  when unique_violation then
    raise exception 'Ese WhatsApp ya está registrado en el spa con otra cuenta' using errcode = '23505';
end;
$$;

revoke all on function public.ensure_customer_profile(uuid, text, text) from public, anon;
grant execute on function public.ensure_customer_profile(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Mascotas

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  customer_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  species public.pet_species not null,
  gender public.pet_gender,
  breed_id uuid not null,
  weight_kg numeric(5, 2) check (weight_kg > 0 and weight_kg <= 150),
  -- Calculadas (resolve_pet_size); el staff puede fijarlas con size_locked.
  size public.pet_size not null,
  coat public.coat_type not null,
  size_locked boolean not null default false,
  photo_path text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, customer_id) references public.customers (tenant_id, id) on delete cascade,
  foreign key (tenant_id, breed_id) references public.tenant_breeds (tenant_id, id) on delete restrict
);

create index pets_customer_idx on public.pets (customer_id);

create function private.breed_info(p_breed_id uuid)
returns table (species public.pet_species, coat public.coat_type, is_mixed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select species, coat, is_mixed from public.tenant_breeds where id = p_breed_id;
$$;

create function private.compute_pet_size()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_breed record;
  v_is_staff boolean := current_user not in ('anon', 'authenticated')
                        or private.is_tenant_staff(new.tenant_id);
begin
  -- Solo el staff fija o libera la talla manual.
  if not v_is_staff then
    if tg_op = 'INSERT' then
      new.size_locked := false;
    else
      new.size_locked := old.size_locked;
      if old.size_locked then
        new.size := old.size;
        new.coat := old.coat;
      end if;
    end if;
  end if;

  select * into v_breed from private.breed_info(new.breed_id);
  if v_breed.species is null then
    raise exception 'La raza no existe' using errcode = '23503';
  end if;
  if v_breed.species <> new.species then
    raise exception 'La especie no coincide con la raza' using errcode = '23514';
  end if;

  if not new.size_locked then
    new.size := public.resolve_pet_size(new.breed_id, new.weight_kg);
    -- Raza definida: el pelo es el de la raza. Criollo: el que elige el cliente (D9).
    new.coat := case when v_breed.is_mixed then coalesce(new.coat, v_breed.coat) else v_breed.coat end;
  end if;
  return new;
end;
$$;

create trigger pets_compute_size
  before insert or update on public.pets
  for each row execute function private.compute_pet_size();

-- ---------------------------------------------------------------------------
-- Grupos "se bañan juntas": mascotas del mismo dueño (D10). Los gestiona el staff.

create table public.pet_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  customer_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, customer_id) references public.customers (tenant_id, id) on delete cascade
);

create table public.pet_group_members (
  tenant_id uuid not null,
  group_id uuid not null,
  pet_id uuid not null unique, -- una mascota pertenece a un solo grupo
  primary key (group_id, pet_id),
  foreign key (tenant_id, group_id) references public.pet_groups (tenant_id, id) on delete cascade,
  foreign key (tenant_id, pet_id) references public.pets (tenant_id, id) on delete cascade
);

create function private.check_pet_group_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.pet_groups g
    join public.pets p on p.customer_id = g.customer_id
    where g.id = new.group_id and p.id = new.pet_id
  ) then
    raise exception 'Solo se agrupan mascotas del mismo dueño' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger pet_group_members_same_owner
  before insert or update on public.pet_group_members
  for each row execute function private.check_pet_group_owner();

create function private.is_own_pet_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pet_groups g
    join public.customers c on c.id = g.customer_id
    where g.id = p_group_id and c.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_own_customer(uuid) from public;
revoke all on function private.is_own_pet_group(uuid) from public;
revoke all on function private.breed_info(uuid) from public;
grant execute on function private.is_own_customer(uuid) to authenticated, service_role;
grant execute on function private.is_own_pet_group(uuid) to authenticated, service_role;
grant execute on function private.breed_info(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS

alter table public.customers enable row level security;
alter table public.pets enable row level security;
alter table public.pet_groups enable row level security;
alter table public.pet_group_members enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['customers', 'pets', 'pet_groups', 'pet_group_members'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_tenant_staff(tenant_id))) with check ((select private.is_tenant_staff(tenant_id)))',
      t || '_all_staff', t);
  end loop;
end;
$$;

-- El cliente: su perfil (lee y edita; el alta va por ensure_customer_profile).
create policy "customers_select_own" on public.customers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "customers_update_own" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- El cliente: sus mascotas.
create policy "pets_select_own" on public.pets
  for select to authenticated using ((select private.is_own_customer(customer_id)));
create policy "pets_insert_own" on public.pets
  for insert to authenticated with check ((select private.is_own_customer(customer_id)));
create policy "pets_update_own" on public.pets
  for update to authenticated
  using ((select private.is_own_customer(customer_id)))
  with check ((select private.is_own_customer(customer_id)));
create policy "pets_delete_own" on public.pets
  for delete to authenticated using ((select private.is_own_customer(customer_id)));

-- El cliente: ve sus grupos (no los crea).
create policy "pet_groups_select_own" on public.pet_groups
  for select to authenticated using ((select private.is_own_customer(customer_id)));
create policy "pet_group_members_select_own" on public.pet_group_members
  for select to authenticated using ((select private.is_own_pet_group(group_id)));
