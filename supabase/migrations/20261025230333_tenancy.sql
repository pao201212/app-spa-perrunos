-- T05 · tenancy: tenants, super admins de plataforma y membresías por tenant.
-- Ver SPEC.md §4 (modelo de datos) y §10 (Never do: tablas sin tenant_id/RLS, auto-asignarse roles).

-- Schema no expuesto por la API: aloja las funciones SECURITY DEFINER que usan las políticas RLS.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  -- Subdominio: {slug}.prismalab.com.co. Minúsculas, dígitos y guiones internos.
  slug text not null unique
    constraint tenants_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$')
    constraint tenants_slug_not_reserved check (
      slug not in ('admin', 'www', 'api', 'app', 'auth', 'platform', 'static', 'assets')
    ),
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true,
  timezone text not null default 'America/Bogota',
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

comment on table public.tenants is 'Cada spa cliente de Prisma Lab, identificado por subdominio.';

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is 'Super admins de Prisma Lab. Solo se gestiona con la secret key.';

create type public.membership_role as enum ('owner', 'admin', 'reception');

create table public.memberships (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- La v1 solo usa 'admin'; 'owner' y 'reception' quedan listos para la v2 (D16).
  role public.membership_role not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

comment on table public.memberships is 'Personal de cada spa. Solo el super admin asigna membresías.';

-- ---------------------------------------------------------------------------
-- Funciones de autorización (usadas por RLS en todas las tablas de negocio)
-- ---------------------------------------------------------------------------

create function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  );
$$;

create function private.is_tenant_staff(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin()
    or exists (
      select 1
      from public.memberships
      where tenant_id = p_tenant_id
        and user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_super_admin() from public;
revoke all on function private.is_tenant_staff(uuid) from public;
grant execute on function private.is_super_admin() to anon, authenticated, service_role;
grant execute on function private.is_tenant_staff(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.platform_admins enable row level security;
alter table public.memberships enable row level security;

-- tenants: el catálogo público muestra los activos; el staff ve el suyo aunque esté inactivo.
create policy "tenants_select_active_or_staff" on public.tenants
  for select to anon, authenticated
  using (is_active or (select private.is_tenant_staff(id)));

create policy "tenants_insert_super_admin" on public.tenants
  for insert to authenticated
  with check ((select private.is_super_admin()));

create policy "tenants_update_super_admin" on public.tenants
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

create policy "tenants_delete_super_admin" on public.tenants
  for delete to authenticated
  using ((select private.is_super_admin()));

-- platform_admins: cada uno puede saber si es super admin. Sin políticas de escritura:
-- solo la secret key (service_role) los gestiona.
revoke all on public.platform_admins from anon;
create policy "platform_admins_select_self" on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));

-- memberships: el usuario ve las suyas; el staff ve las de su tenant; solo el super admin escribe.
revoke all on public.memberships from anon;
create policy "memberships_select_self_or_staff" on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_tenant_staff(tenant_id)));

create policy "memberships_insert_super_admin" on public.memberships
  for insert to authenticated
  with check ((select private.is_super_admin()));

create policy "memberships_update_super_admin" on public.memberships
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

create policy "memberships_delete_super_admin" on public.memberships
  for delete to authenticated
  using ((select private.is_super_admin()));
