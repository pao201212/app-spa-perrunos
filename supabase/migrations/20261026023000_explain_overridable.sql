-- La regla de qué motivos admiten sobrecupo vive solo en SQL (SPEC §10): explain_slots la
-- devuelve por hora para que el panel no la repita en TypeScript.

drop function public.explain_slots(uuid, date, jsonb);

create function public.explain_slots(p_location_id uuid, p_date date, p_pets jsonb)
returns table (
  starts_at timestamptz,
  estimated_ready_at timestamptz,
  code text,
  detail jsonb,
  overridable boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.locations l
    where l.id = p_location_id and private.is_tenant_staff(l.tenant_id)
  ) then
    raise exception 'No puedes administrar este local' using errcode = '42501';
  end if;
  return query
    select e.starts_at, e.estimated_ready_at, e.code, e.detail,
           e.code is not null and capacity.overridable(e.code)
    from capacity.evaluate(p_location_id, p_date, p_pets) e
    order by e.starts_at nulls first;
end;
$$;

revoke all on function public.explain_slots(uuid, date, jsonb) from public, anon;
grant execute on function public.explain_slots(uuid, date, jsonb) to authenticated;
