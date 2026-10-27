-- T27 · claim_customer_profile idempotente: si el usuario ya tiene perfil en el spa, lo devuelve.
-- Next puede renderizar la misma página dos veces en paralelo (página + prefetch): la segunda
-- llamada encontraba el perfil ya vinculado, devolvía null y mandaba al cliente a /perfil.

create or replace function public.claim_customer_profile(p_tenant_id uuid)
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

  if v_customer_id is null then
    select id into v_customer_id
    from public.customers
    where tenant_id = p_tenant_id and user_id = v_user_id;
  end if;

  return v_customer_id;
end;
$$;
