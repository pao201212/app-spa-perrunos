-- T44 · Flujo de estados de la cita (SPEC §2): Por confirmar → Agendada → Recibida → Atendiendo
-- → Lista → Entregada; se cancela antes de atenderla y "No asistió" solo si estaba agendada.
-- Aplica a la API (staff); la secret key y las funciones internas no pasan por aquí.

create function private.appointment_status_allowed(
  p_from public.appointment_status,
  p_to public.appointment_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_from = p_to or (p_from, p_to) in (
    ('pending', 'scheduled'), ('pending', 'cancelled'),
    ('scheduled', 'received'), ('scheduled', 'cancelled'), ('scheduled', 'no_show'),
    ('received', 'in_progress'), ('received', 'cancelled'),
    ('in_progress', 'ready'),
    ('ready', 'delivered')
  );
$$;

create or replace function private.guard_appointment_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if (new.tenant_id, new.location_id, new.customer_id, new.pet_group_id, new.code,
        new.starts_at, new.total_cop, new.source, new.overbooked, new.created_by, new.created_at)
       is distinct from
       (old.tenant_id, old.location_id, old.customer_id, old.pet_group_id, old.code,
        old.starts_at, old.total_cop, old.source, old.overbooked, old.created_by, old.created_at) then
      raise exception 'Solo se puede cambiar el estado, la entrega y las notas de la cita'
        using errcode = '42501';
    end if;
    if not private.appointment_status_allowed(old.status, new.status) then
      raise exception 'No se puede pasar de % a %', old.status, new.status using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.appointment_status_allowed(public.appointment_status, public.appointment_status) from public;
grant execute on function private.appointment_status_allowed(public.appointment_status, public.appointment_status) to authenticated, service_role;
