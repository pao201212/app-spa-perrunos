-- D25 / D26 (2026-10-26, validado con Spa Perrunos y Gatunos)
--   · La mesa de secado es la misma de los detalles: la etapa "terminado" pasa a llamarse
--     "detalles" (orejas, uñas, corte higiénico, perfume, tijera en patas…) y se hace en la mesa.
--   · La tercera estación es la de corte (corte especial del groomer).
--   · Opcionales sin costo del baño, cada uno marcado para la etapa de baño o de detalles.

-- Estaciones: tina (bath), mesa de secado y detalles (dry), estación de corte (cut).
alter type public.station_type rename value 'finish' to 'cut';

-- Habilidad de la etapa de detalles.
alter type public.staff_skill rename value 'finish' to 'details';

-- Minutos de la etapa de detalles.
alter table public.service_durations rename column finish_min to details_min;

create or replace function private.check_service_duration_stages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.service_kind;
begin
  select kind into v_kind from public.services where id = new.service_id;
  if v_kind = 'bath' and (new.bath_min is null or new.dry_min is null or new.details_min is null or new.cut_min is not null) then
    raise exception 'El baño necesita minutos de baño, secado y detalles (y no de corte)' using errcode = '23514';
  elsif v_kind = 'special_cut' and (new.cut_min is null or coalesce(new.bath_min, new.dry_min, new.details_min) is not null) then
    raise exception 'El corte especial solo lleva minutos de corte' using errcode = '23514';
  elsif v_kind = 'other' and (new.details_min is null or coalesce(new.bath_min, new.dry_min, new.cut_min) is not null) then
    raise exception 'Este servicio solo lleva minutos de detalles' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.replace_service_durations(p_service_id uuid, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.services where id = p_service_id;
  if v_tenant_id is null or not private.is_tenant_staff(v_tenant_id) then
    raise exception 'No puedes administrar este servicio' using errcode = '42501';
  end if;

  delete from public.service_durations where service_id = p_service_id;

  insert into public.service_durations (tenant_id, service_id, size, coat, bath_min, dry_min, details_min, cut_min)
  select v_tenant_id, p_service_id, r.size, r.coat, r.bath_min, r.dry_min, r.details_min, r.cut_min
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r (
    size public.pet_size,
    coat public.coat_type,
    bath_min integer,
    dry_min integer,
    details_min integer,
    cut_min integer
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Opcionales sin costo (D26): el cliente los marca al reservar; el personal sabe en qué etapa
-- hacerlos. No tienen precio ni suman tiempo.

create type public.option_stage as enum ('bath', 'details');

create table public.service_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  service_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  stage public.option_stage not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  unique (tenant_id, id),
  foreign key (tenant_id, service_id) references public.services (tenant_id, id) on delete cascade
);

create unique index service_options_name_key on public.service_options (service_id, lower(name));

alter table public.service_options enable row level security;

create policy "service_options_select_public_or_staff" on public.service_options
  for select to anon, authenticated
  using ((is_active and (select private.is_tenant_public(tenant_id))) or (select private.is_tenant_staff(tenant_id)));

create policy "service_options_insert_staff" on public.service_options
  for insert to authenticated with check ((select private.is_tenant_staff(tenant_id)));
create policy "service_options_update_staff" on public.service_options
  for update to authenticated
  using ((select private.is_tenant_staff(tenant_id)))
  with check ((select private.is_tenant_staff(tenant_id)));
create policy "service_options_delete_staff" on public.service_options
  for delete to authenticated using ((select private.is_tenant_staff(tenant_id)));
