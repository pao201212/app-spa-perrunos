-- T15 · Anti-escalada de roles (defensa en profundidad, además de RLS).
-- Si en el futuro se agregara por error una política permisiva sobre memberships o platform_admins,
-- este trigger sigue impidiendo que un usuario se otorgue permisos desde la API.

-- SECURITY INVOKER a propósito: current_user debe ser el rol de quien llama
-- (anon/authenticated vía PostgREST; service_role con la secret key; postgres en migraciones).
create function private.guard_role_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'platform_admins' then
    raise exception 'Los super admins solo se gestionan con la secret key'
      using errcode = '42501';
  end if;

  if not private.is_super_admin() then
    raise exception 'Solo un super admin puede modificar membresías'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger memberships_guard_role_changes
  before insert or update or delete on public.memberships
  for each row execute function private.guard_role_changes();

create trigger platform_admins_guard_role_changes
  before insert or update or delete on public.platform_admins
  for each row execute function private.guard_role_changes();
