-- T31 · Guardar la matriz de duraciones (talla × pelo) de un servicio en una sola transacción.
-- SECURITY INVOKER: RLS limita al staff del spa; el trigger valida las etapas según el tipo.

create function public.replace_service_durations(p_service_id uuid, p_rows jsonb)
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

  insert into public.service_durations (tenant_id, service_id, size, coat, bath_min, dry_min, finish_min, cut_min)
  select v_tenant_id, p_service_id, r.size, r.coat, r.bath_min, r.dry_min, r.finish_min, r.cut_min
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r (
    size public.pet_size,
    coat public.coat_type,
    bath_min integer,
    dry_min integer,
    finish_min integer,
    cut_min integer
  );
end;
$$;

revoke all on function public.replace_service_durations(uuid, jsonb) from public, anon;
grant execute on function public.replace_service_durations(uuid, jsonb) to authenticated;
