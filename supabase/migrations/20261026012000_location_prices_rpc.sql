-- T32 · Precios por local de un servicio y sus extras (D8).
-- SECURITY INVOKER: RLS limita al staff del spa. Cada función es una sola transacción.

create function public.replace_location_prices(
  p_location_id uuid,
  p_service_id uuid,
  p_service_rows jsonb,
  p_extra_rows jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.services where id = p_service_id;
  if v_tenant_id is null or not private.is_tenant_staff(v_tenant_id)
     or not exists (select 1 from public.locations where id = p_location_id and tenant_id = v_tenant_id) then
    raise exception 'No puedes administrar los precios de este servicio en este local' using errcode = '42501';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_extra_rows, '[]'::jsonb)) as r (extra_id uuid)
    where not exists (select 1 from public.extras e where e.id = r.extra_id and e.service_id = p_service_id)
  ) then
    raise exception 'Hay un extra que no pertenece a este servicio' using errcode = '22023';
  end if;

  delete from public.location_service_prices where location_id = p_location_id and service_id = p_service_id;
  delete from public.location_extra_prices
  where location_id = p_location_id
    and extra_id in (select id from public.extras where service_id = p_service_id);

  insert into public.location_service_prices (tenant_id, location_id, service_id, size, coat, price_cop)
  select v_tenant_id, p_location_id, p_service_id, r.size, r.coat, r.price_cop
  from jsonb_to_recordset(coalesce(p_service_rows, '[]'::jsonb))
    as r (size public.pet_size, coat public.coat_type, price_cop integer);

  insert into public.location_extra_prices (tenant_id, location_id, extra_id, size, coat, price_cop)
  select v_tenant_id, p_location_id, r.extra_id, r.size, r.coat, r.price_cop
  from jsonb_to_recordset(coalesce(p_extra_rows, '[]'::jsonb))
    as r (extra_id uuid, size public.pet_size, coat public.coat_type, price_cop integer);
end;
$$;

-- Copia los precios del servicio (y sus extras) de un local a todos los demás del spa.
create function public.copy_service_prices(p_service_id uuid, p_source_location_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_targets uuid[];
begin
  select tenant_id into v_tenant_id from public.services where id = p_service_id;
  if v_tenant_id is null or not private.is_tenant_staff(v_tenant_id) then
    raise exception 'No puedes administrar este servicio' using errcode = '42501';
  end if;

  select coalesce(array_agg(id), '{}') into v_targets
  from public.locations
  where tenant_id = v_tenant_id and id <> p_source_location_id;

  delete from public.location_service_prices where service_id = p_service_id and location_id = any (v_targets);
  insert into public.location_service_prices (tenant_id, location_id, service_id, size, coat, price_cop)
  select v_tenant_id, t.id, p.service_id, p.size, p.coat, p.price_cop
  from public.location_service_prices p
  cross join unnest(v_targets) as t (id)
  where p.service_id = p_service_id and p.location_id = p_source_location_id;

  delete from public.location_extra_prices
  where location_id = any (v_targets)
    and extra_id in (select id from public.extras where service_id = p_service_id);
  insert into public.location_extra_prices (tenant_id, location_id, extra_id, size, coat, price_cop)
  select v_tenant_id, t.id, p.extra_id, p.size, p.coat, p.price_cop
  from public.location_extra_prices p
  join public.extras e on e.id = p.extra_id and e.service_id = p_service_id
  cross join unnest(v_targets) as t (id)
  where p.location_id = p_source_location_id;

  return cardinality(v_targets);
end;
$$;

revoke all on function public.replace_location_prices(uuid, uuid, jsonb, jsonb) from public, anon;
revoke all on function public.copy_service_prices(uuid, uuid) from public, anon;
grant execute on function public.replace_location_prices(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.copy_service_prices(uuid, uuid) to authenticated;
