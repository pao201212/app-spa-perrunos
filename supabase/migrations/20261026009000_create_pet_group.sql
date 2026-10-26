-- T28 · Crear un grupo "se bañan juntas" con sus mascotas en una sola transacción (D10, D23).
-- SECURITY INVOKER: RLS limita la operación al staff del spa; el trigger valida mismo dueño.

create function public.create_pet_group(p_customer_id uuid, p_pet_ids uuid[])
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_group_id uuid;
begin
  if p_pet_ids is null or cardinality(array(select distinct unnest(p_pet_ids))) < 2 then
    raise exception 'Un grupo necesita al menos dos mascotas' using errcode = '22023';
  end if;

  select tenant_id into v_tenant_id from public.customers where id = p_customer_id;
  if v_tenant_id is null then
    raise exception 'El cliente no existe' using errcode = 'P0002';
  end if;

  insert into public.pet_groups (tenant_id, customer_id)
  values (v_tenant_id, p_customer_id)
  returning id into v_group_id;

  insert into public.pet_group_members (tenant_id, group_id, pet_id)
  select v_tenant_id, v_group_id, pet_id
  from (select distinct unnest(p_pet_ids) as pet_id) pets;

  return v_group_id;
end;
$$;

revoke all on function public.create_pet_group(uuid, uuid[]) from public, anon;
grant execute on function public.create_pet_group(uuid, uuid[]) to authenticated;
