-- T22 · Restaurar una raza ajustada por el spa a los valores del catálogo global.
-- SECURITY DEFINER porque un update del staff marcaría la raza como personalizada.

create function public.reset_tenant_breed(p_breed_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_breed public.tenant_breeds;
  v_global public.global_breeds;
begin
  select * into v_breed from public.tenant_breeds where id = p_breed_id;
  if v_breed.id is null or not private.is_tenant_staff(v_breed.tenant_id) then
    raise exception 'No puedes administrar esta raza' using errcode = '42501';
  end if;

  select * into v_global from public.global_breeds where id = v_breed.global_breed_id;
  if v_global.id is null then
    raise exception 'Esta raza no viene del catálogo de Prisma Lab: no hay valores que restaurar'
      using errcode = '22023';
  end if;

  update public.tenant_breeds
  set name = v_global.name,
      species = v_global.species,
      size = v_global.default_size,
      coat = v_global.default_coat,
      is_mixed = v_global.is_mixed,
      is_customized = false
  where id = p_breed_id;
end;
$$;

revoke all on function public.reset_tenant_breed(uuid) from public, anon;
grant execute on function public.reset_tenant_breed(uuid) to authenticated;
