-- T27 · Vinculación automática al entrar con Google (D13): si el admin inscribió al cliente con
-- el mismo correo, el perfil queda enlazado a su cuenta sin pedirle datos. No crea perfiles.

create function public.claim_customer_profile(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;

  update public.customers c
  set user_id = v_user_id
  from auth.users u
  where u.id = v_user_id
    and c.tenant_id = p_tenant_id
    and c.user_id is null
    and c.email = lower(u.email)
    and not exists (
      select 1 from public.customers own where own.tenant_id = p_tenant_id and own.user_id = v_user_id
    )
  returning c.id into v_customer_id;

  return v_customer_id;
end;
$$;

revoke all on function public.claim_customer_profile(uuid) from public, anon;
grant execute on function public.claim_customer_profile(uuid) to authenticated;
