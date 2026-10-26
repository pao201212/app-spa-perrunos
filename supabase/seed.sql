-- Datos de desarrollo y tests. Se aplica con `npm run db:reset`.

insert into public.tenants (slug, name)
values
  ('spaperrunosygatunos', 'Spa Perrunos y Gatunos'),
  ('demo', 'Spa Demo')
on conflict (slug) do nothing;

-- Un local por spa con estaciones y horario aproximado al del legado PetSpa
-- (lunes a viernes 08:00-12:30 y 13:00-18:00, sábado 08:00-13:00, domingo cerrado).
with spa as (
  select id from public.tenants where slug in ('spaperrunosygatunos', 'demo')
), sede as (
  insert into public.locations (tenant_id, name, address, whatsapp)
  select id, 'Sede principal', 'Dirección por definir', '+57 300 000 0000' from spa
  on conflict do nothing
  returning id, tenant_id
), stations as (
  insert into public.location_stations (tenant_id, location_id, station, count)
  select s.tenant_id, s.id, st.station::public.station_type, st.count
  from sede s
  cross join (values ('bath', 2), ('dry', 2), ('finish', 1)) as st (station, count)
)
insert into public.location_hours (tenant_id, location_id, weekday, opens_at, closes_at)
select s.tenant_id, s.id, h.weekday, h.opens_at::time, h.closes_at::time
from sede s
cross join (
  values
    (1, '08:00', '12:30'), (1, '13:00', '18:00'),
    (2, '08:00', '12:30'), (2, '13:00', '18:00'),
    (3, '08:00', '12:30'), (3, '13:00', '18:00'),
    (4, '08:00', '12:30'), (4, '13:00', '18:00'),
    (5, '08:00', '12:30'), (5, '13:00', '18:00'),
    (6, '08:00', '13:00')
) as h (weekday, opens_at, closes_at);
