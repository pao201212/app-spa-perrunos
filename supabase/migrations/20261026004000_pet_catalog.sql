-- T21 · Catálogo de mascotas por spa: tallas por peso y razas (D9).
--
-- Cada spa tiene su copia del catálogo global (tenant_breeds) enlazada por global_breed_id:
--   · cambios del catálogo global se propagan a las razas que el spa NO personalizó;
--   · razas globales nuevas llegan a todos los spas; si una global se borra, el spa la conserva;
--   · el spa puede ajustar talla/pelo, ocultar razas o crear razas propias.

-- ---------------------------------------------------------------------------
-- Tablas

create table public.size_thresholds (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  species public.pet_species not null,
  size public.pet_size not null,
  -- Peso máximo (incluido) de la talla. Por encima del último umbral → la talla más grande.
  max_kg numeric(6, 2) not null check (max_kg > 0),
  primary key (tenant_id, species, size)
);

create table public.tenant_breeds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  global_breed_id uuid references public.global_breeds (id) on delete set null,
  species public.pet_species not null,
  name text not null check (length(trim(name)) > 0),
  size public.pet_size not null,
  coat public.coat_type not null,
  is_mixed boolean not null default false,
  -- true si el spa la creó o la ajustó: deja de recibir cambios del catálogo global.
  is_customized boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index tenant_breeds_name_key on public.tenant_breeds (tenant_id, species, lower(name));
create unique index tenant_breeds_global_key on public.tenant_breeds (tenant_id, global_breed_id)
  where global_breed_id is not null;
create unique index tenant_breeds_one_mixed on public.tenant_breeds (tenant_id, species) where is_mixed;

-- ---------------------------------------------------------------------------
-- Valores iniciales de cada spa

create function private.seed_tenant_pet_catalog(p_tenant_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.size_thresholds (tenant_id, species, size, max_kg)
  values
    -- Umbrales del legado PetSpa (pet_size_thresholds).
    (p_tenant_id, 'dog', 'XS', 5), (p_tenant_id, 'dog', 'S', 10), (p_tenant_id, 'dog', 'M', 20),
    (p_tenant_id, 'dog', 'L', 30), (p_tenant_id, 'dog', 'XL', 40), (p_tenant_id, 'dog', 'XXL', 100),
    (p_tenant_id, 'cat', 'XS', 2), (p_tenant_id, 'cat', 'S', 4), (p_tenant_id, 'cat', 'M', 6),
    (p_tenant_id, 'cat', 'L', 8), (p_tenant_id, 'cat', 'XL', 10)
  on conflict do nothing;

  insert into public.tenant_breeds (tenant_id, global_breed_id, species, name, size, coat, is_mixed)
  select p_tenant_id, g.id, g.species, g.name, g.default_size, g.default_coat, g.is_mixed
  from public.global_breeds g
  on conflict do nothing;
$$;

create function private.on_tenant_created_seed_catalog()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_tenant_pet_catalog(new.id);
  return new;
end;
$$;

create trigger tenants_seed_pet_catalog
  after insert on public.tenants
  for each row execute function private.on_tenant_created_seed_catalog();

-- Spas que ya existían antes de esta migración.
select private.seed_tenant_pet_catalog(id) from public.tenants;

-- ---------------------------------------------------------------------------
-- Propagación desde el catálogo global (corre como postgres: no marca is_customized)

create function private.on_global_breed_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.tenant_breeds (tenant_id, global_breed_id, species, name, size, coat, is_mixed)
    select t.id, new.id, new.species, new.name, new.default_size, new.default_coat, new.is_mixed
    from public.tenants t
    on conflict do nothing;
  else
    update public.tenant_breeds
    set species = new.species,
        name = new.name,
        size = new.default_size,
        coat = new.default_coat,
        is_mixed = new.is_mixed
    where global_breed_id = new.id and not is_customized;
  end if;
  return new;
end;
$$;

create trigger global_breeds_propagate
  after insert or update on public.global_breeds
  for each row execute function private.on_global_breed_changed();

-- Cambios hechos por usuarios (staff) marcan la raza como personalizada. El enlace al
-- catálogo global no lo puede fijar ni cambiar un usuario.
create function private.on_tenant_breed_user_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.is_customized := true;
    new.global_breed_id := case when tg_op = 'UPDATE' then old.global_breed_id else null end;
  end if;
  return new;
end;
$$;

create trigger tenant_breeds_mark_customized
  before insert or update on public.tenant_breeds
  for each row execute function private.on_tenant_breed_user_change();

-- ---------------------------------------------------------------------------
-- Umbrales crecientes (se valida al final de la transacción para permitir ajustes en bloque)

create function private.check_size_thresholds_increasing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from (
      select max_kg, lag(max_kg) over (order by size) as previous
      from public.size_thresholds
      where tenant_id = new.tenant_id and species = new.species
    ) ordered
    where previous is not null and max_kg <= previous
  ) then
    raise exception 'Los umbrales de talla deben ser crecientes (XS < S < M < L < XL < XXL)'
      using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger size_thresholds_increasing
  after insert or update on public.size_thresholds
  deferrable initially deferred
  for each row execute function private.check_size_thresholds_increasing();

-- ---------------------------------------------------------------------------
-- Talla de una mascota: el peso manda; sin peso, la talla de la raza (D9).

create function public.resolve_pet_size(p_breed_id uuid, p_weight_kg numeric default null)
returns public.pet_size
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_weight_kg is null then b.size
    else coalesce(
      (select t.size from public.size_thresholds t
       where t.tenant_id = b.tenant_id and t.species = b.species and t.max_kg >= p_weight_kg
       order by t.max_kg limit 1),
      (select t.size from public.size_thresholds t
       where t.tenant_id = b.tenant_id and t.species = b.species
       order by t.max_kg desc limit 1),
      b.size)
  end
  from public.tenant_breeds b
  where b.id = p_breed_id;
$$;

revoke all on function public.resolve_pet_size(uuid, numeric) from public;
grant execute on function public.resolve_pet_size(uuid, numeric) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: lectura pública (el cliente los usa al registrar su mascota); escritura del staff.

alter table public.size_thresholds enable row level security;
alter table public.tenant_breeds enable row level security;

create function private.is_tenant_public(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.tenants where id = p_tenant_id and is_active);
$$;

revoke all on function private.is_tenant_public(uuid) from public;
grant execute on function private.is_tenant_public(uuid) to anon, authenticated, service_role;

create policy "size_thresholds_select_public_or_staff" on public.size_thresholds
  for select to anon, authenticated
  using ((select private.is_tenant_public(tenant_id)) or (select private.is_tenant_staff(tenant_id)));

create policy "tenant_breeds_select_public_or_staff" on public.tenant_breeds
  for select to anon, authenticated
  using ((is_active and (select private.is_tenant_public(tenant_id))) or (select private.is_tenant_staff(tenant_id)));

do $$
declare
  t text;
begin
  foreach t in array array['size_thresholds', 'tenant_breeds'] loop
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
