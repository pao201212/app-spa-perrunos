-- T16 · Asignar admins de un spa por correo (consola de plataforma).
-- Si la persona ya tiene cuenta, se crea la membresía; si no, queda una invitación que se
-- convierte en membresía la primera vez que entra con Google.

create table public.tenant_invites (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null
    constraint tenant_invites_email_normalized check (email = lower(email))
    constraint tenant_invites_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.membership_role not null default 'admin',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, email)
);

create index tenant_invites_email_idx on public.tenant_invites (email);

comment on table public.tenant_invites is
  'Invitaciones pendientes al staff de un spa. Solo se escriben con assign_tenant_admin().';

alter table public.tenant_invites enable row level security;
revoke all on public.tenant_invites from anon;

-- Lectura para el staff del spa; sin políticas de escritura: solo vía las funciones de abajo.
create policy "tenant_invites_select_staff" on public.tenant_invites
  for select to authenticated
  using ((select private.is_tenant_staff(tenant_id)));

-- ---------------------------------------------------------------------------

create function public.assign_tenant_admin(p_tenant_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid;
begin
  if not private.is_super_admin() then
    raise exception 'Solo un super admin puede asignar administradores' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El correo no es válido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'El spa no existe' using errcode = 'P0002';
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email;

  if v_user_id is not null then
    insert into public.memberships (tenant_id, user_id, role)
    values (p_tenant_id, v_user_id, 'admin')
    on conflict (tenant_id, user_id) do nothing;
    return 'member';
  end if;

  insert into public.tenant_invites (tenant_id, email, invited_by)
  values (p_tenant_id, v_email, (select auth.uid()))
  on conflict (tenant_id, email) do nothing;
  return 'invited';
end;
$$;

comment on function public.assign_tenant_admin(uuid, text) is
  'Super admin: agrega un admin al spa por correo. Devuelve ''member'' o ''invited''.';

create function public.tenant_staff(p_tenant_id uuid)
returns table (email text, role public.membership_role, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    raise exception 'Solo un super admin puede ver el staff de un spa' using errcode = '42501';
  end if;

  return query
    select u.email::text, m.role, 'active'::text
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant_id
    union all
    select i.email, i.role, 'invited'::text
    from public.tenant_invites i
    where i.tenant_id = p_tenant_id
    order by 1;
end;
$$;

revoke all on function public.assign_tenant_admin(uuid, text) from public, anon;
revoke all on function public.tenant_staff(uuid) from public, anon;
grant execute on function public.assign_tenant_admin(uuid, text) to authenticated;
grant execute on function public.tenant_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Al crearse (o cambiar de correo) un usuario, sus invitaciones pasan a ser membresías.

create function private.claim_tenant_invites()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.memberships (tenant_id, user_id, role)
  select i.tenant_id, new.id, i.role
  from public.tenant_invites i
  where i.email = lower(new.email)
  on conflict (tenant_id, user_id) do nothing;

  delete from public.tenant_invites where email = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_claim_tenant_invites
  after insert or update of email on auth.users
  for each row execute function private.claim_tenant_invites();
