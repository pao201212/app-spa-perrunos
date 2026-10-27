-- T42 · El cliente confirma la recepción de su mascota cuando el spa la recibe (SPEC §2, HU-B5).
-- Solo su propia cita, una vez, y solo después de que el spa la marcó como recibida.

create function public.confirm_reception(p_appointment_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.appointment_status;
  v_confirmed timestamptz;
begin
  select a.status, a.client_confirmed_at into v_status, v_confirmed
  from public.appointments a
  where a.id = p_appointment_id and private.is_own_appointment(a.id);
  if v_status is null then
    raise exception 'La cita no existe' using errcode = 'P0002';
  end if;
  if v_status not in ('received', 'in_progress', 'ready', 'delivered') then
    raise exception 'El spa aún no ha recibido a tu mascota' using errcode = '22023';
  end if;
  if v_confirmed is not null then
    return v_confirmed;
  end if;
  update public.appointments set client_confirmed_at = now()
  where id = p_appointment_id
  returning client_confirmed_at into v_confirmed;
  return v_confirmed;
end;
$$;

revoke all on function public.confirm_reception(uuid) from public, anon;
grant execute on function public.confirm_reception(uuid) to authenticated;
