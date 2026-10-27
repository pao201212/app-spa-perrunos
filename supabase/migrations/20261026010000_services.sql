-- T29 · Servicios del spa (SPEC §4, D6, D7, D8, D18).
--   bath        → baño con 3 etapas: baño → secado → terminado
--   special_cut → corte especial (groomer), adicional al baño
--   other       → otros servicios en la estación de terminado (p. ej. corte de uñas)
-- Duración por spa × talla × pelo (D7). Precio por local × talla × pelo (D8); sin precio para una
-- combinación, el servicio no se ofrece para esa combinación en ese local.

create type public.service_kind as enum ('bath', 'special_cut', 'other');
create type public.service_species as enum ('dog', 'cat', 'both');

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  unique (tenant_id, id)
);

create unique index service_categories_name_key on public.service_categories (tenant_id, lower(name));

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  category_id uuid,
  kind public.service_kind not null,
  name text not null check (length(trim(name)) > 0),
  description text,
  species public.service_species not null default 'both',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, category_id) references public.service_categories (tenant_id, id) on delete set null (category_id)
);

create unique index services_name_key on public.services (tenant_id, lower(name));

create table public.extras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  service_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  -- Minutos que suma a la etapa de terminado (S2). Por defecto no añade tiempo.
  extra_minutes integer not null default 0 check (extra_minutes between 0 and 240 and extra_minutes % 5 = 0),
  is_active boolean not null default true,
  unique (tenant_id, id),
  foreign key (tenant_id, service_id) references public.services (tenant_id, id) on delete cascade
);

create unique index extras_name_key on public.extras (service_id, lower(name));

create table public.service_durations (
  tenant_id uuid not null,
  service_id uuid not null,
  size public.pet_size not null,
  coat public.coat_type not null,
  bath_min integer check (bath_min > 0 and bath_min <= 480 and bath_min % 5 = 0),
  dry_min integer check (dry_min > 0 and dry_min <= 480 and dry_min % 5 = 0),
  finish_min integer check (finish_min > 0 and finish_min <= 480 and finish_min % 5 = 0),
  cut_min integer check (cut_min > 0 and cut_min <= 480 and cut_min % 5 = 0),
  primary key (service_id, size, coat),
  foreign key (tenant_id, service_id) references public.services (tenant_id, id) on delete cascade
);

-- Las etapas que aplican dependen del tipo de servicio.
create function private.check_service_duration_stages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.service_kind;
begin
  select kind into v_kind from public.services where id = new.service_id;
  if v_kind = 'bath' and (new.bath_min is null or new.dry_min is null or new.finish_min is null or new.cut_min is not null) then
    raise exception 'El baño necesita minutos de baño, secado y terminado (y no de corte)' using errcode = '23514';
  elsif v_kind = 'special_cut' and (new.cut_min is null or coalesce(new.bath_min, new.dry_min, new.finish_min) is not null) then
    raise exception 'El corte especial solo lleva minutos de corte' using errcode = '23514';
  elsif v_kind = 'other' and (new.finish_min is null or coalesce(new.bath_min, new.dry_min, new.cut_min) is not null) then
    raise exception 'Este servicio solo lleva minutos de terminado' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger service_durations_check_stages
  before insert or update on public.service_durations
  for each row execute function private.check_service_duration_stages();

create table public.location_service_prices (
  tenant_id uuid not null,
  location_id uuid not null,
  service_id uuid not null,
  size public.pet_size not null,
  coat public.coat_type not null,
  price_cop integer not null check (price_cop >= 0),
  primary key (location_id, service_id, size, coat),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade,
  foreign key (tenant_id, service_id) references public.services (tenant_id, id) on delete cascade
);

create table public.location_extra_prices (
  tenant_id uuid not null,
  location_id uuid not null,
  extra_id uuid not null,
  size public.pet_size not null,
  coat public.coat_type not null,
  price_cop integer not null check (price_cop >= 0),
  primary key (location_id, extra_id, size, coat),
  foreign key (tenant_id, location_id) references public.locations (tenant_id, id) on delete cascade,
  foreign key (tenant_id, extra_id) references public.extras (tenant_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- RLS: catálogo público de spas activos (lo activo); escritura solo del staff.

do $$
declare
  t text;
begin
  foreach t in array array[
    'service_categories', 'services', 'extras', 'service_durations',
    'location_service_prices', 'location_extra_prices'
  ] loop
    execute format('alter table public.%I enable row level security', t);
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

create policy "service_categories_select_public_or_staff" on public.service_categories
  for select to anon, authenticated
  using ((select private.is_tenant_public(tenant_id)) or (select private.is_tenant_staff(tenant_id)));

create policy "services_select_public_or_staff" on public.services
  for select to anon, authenticated
  using ((is_active and (select private.is_tenant_public(tenant_id))) or (select private.is_tenant_staff(tenant_id)));

create policy "extras_select_public_or_staff" on public.extras
  for select to anon, authenticated
  using ((is_active and (select private.is_tenant_public(tenant_id))) or (select private.is_tenant_staff(tenant_id)));

create policy "service_durations_select_public_or_staff" on public.service_durations
  for select to anon, authenticated
  using ((select private.is_tenant_public(tenant_id)) or (select private.is_tenant_staff(tenant_id)));

create policy "location_service_prices_select_public_or_staff" on public.location_service_prices
  for select to anon, authenticated
  using ((select private.is_location_public(location_id)) or (select private.is_tenant_staff(tenant_id)));

create policy "location_extra_prices_select_public_or_staff" on public.location_extra_prices
  for select to anon, authenticated
  using ((select private.is_location_public(location_id)) or (select private.is_tenant_staff(tenant_id)));
