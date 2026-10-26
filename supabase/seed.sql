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

-- Personal de ejemplo por spa: dos bañadores y un groomer que solo trabaja los sábados (D5).
with sede as (
  select l.id as location_id, l.tenant_id
  from public.locations l
  join public.tenants t on t.id = l.tenant_id
  where t.slug in ('spaperrunosygatunos', 'demo') and l.name = 'Sede principal'
), people as (
  insert into public.staff (tenant_id, name)
  select s.tenant_id, p.name
  from sede s
  cross join (values ('Bañador 1'), ('Bañador 2'), ('Groomer')) as p (name)
  on conflict do nothing
  returning id, tenant_id, name
), skills as (
  insert into public.staff_skills (tenant_id, staff_id, skill)
  select p.tenant_id, p.id, k.skill::public.staff_skill
  from people p
  join (
    values ('Bañador 1', 'bath'), ('Bañador 1', 'dry'), ('Bañador 1', 'finish'),
           ('Bañador 2', 'bath'), ('Bañador 2', 'dry'),
           ('Groomer', 'finish'), ('Groomer', 'special_cut')
  ) as k (name, skill) on k.name = p.name
)
insert into public.staff_shifts (tenant_id, staff_id, location_id, weekday, starts_at, ends_at)
select p.tenant_id, p.id, s.location_id, h.weekday, h.starts_at::time, h.ends_at::time
from people p
join sede s on s.tenant_id = p.tenant_id
join (
  values
    ('Bañador', 1, '08:00', '12:30'), ('Bañador', 1, '13:00', '18:00'),
    ('Bañador', 2, '08:00', '12:30'), ('Bañador', 2, '13:00', '18:00'),
    ('Bañador', 3, '08:00', '12:30'), ('Bañador', 3, '13:00', '18:00'),
    ('Bañador', 4, '08:00', '12:30'), ('Bañador', 4, '13:00', '18:00'),
    ('Bañador', 5, '08:00', '12:30'), ('Bañador', 5, '13:00', '18:00'),
    ('Bañador', 6, '08:00', '13:00'),
    ('Groomer', 6, '08:00', '13:00')
) as h (who, weekday, starts_at, ends_at) on p.name like h.who || '%';
