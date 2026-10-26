-- T36 · Guardar la matriz de capacidad simple (especie × talla × pelo) de un local en una transacción.
-- SECURITY INVOKER: RLS limita al staff del spa.

create function public.replace_location_pet_capacity(p_location_id uuid, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.locations where id = p_location_id;
  -- Los locales activos son públicos: además de verlo, hay que ser staff de su spa.
  if v_tenant_id is null or not private.is_tenant_staff(v_tenant_id) then
    raise exception 'No puedes administrar este local' using errcode = '42501';
  end if;

  delete from public.location_pet_capacity where location_id = p_location_id;

  insert into public.location_pet_capacity (tenant_id, location_id, species, size, coat, pets_per_staff)
  select v_tenant_id, p_location_id, r.species, r.size, r.coat, r.pets_per_staff
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r (
    species public.pet_species,
    size public.pet_size,
    coat public.coat_type,
    pets_per_staff integer
  );
end;
$$;

revoke all on function public.replace_location_pet_capacity(uuid, jsonb) from public, anon;
grant execute on function public.replace_location_pet_capacity(uuid, jsonb) to authenticated;
