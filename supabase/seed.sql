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
  cross join (values ('bath', 2), ('dry', 2), ('cut', 1)) as st (station, count)
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
    values ('Bañador 1', 'bath'), ('Bañador 1', 'dry'), ('Bañador 1', 'details'),
           ('Bañador 2', 'bath'), ('Bañador 2', 'dry'),
           ('Groomer', 'details'), ('Groomer', 'special_cut')
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

-- Servicios de ejemplo por spa: duraciones por talla × pelo y precios en la Sede principal (COP).
-- Valores aproximados para desarrollo; cada spa los ajusta en su panel.
with spa as (
  select id as tenant_id from public.tenants where slug in ('spaperrunosygatunos', 'demo')
), categories as (
  insert into public.service_categories (tenant_id, name, sort_order)
  select tenant_id, c.name, c.sort_order from spa
  cross join (values ('Higiene', 1), ('Estilo', 2)) as c (name, sort_order)
  on conflict do nothing
  returning id, tenant_id, name
)
insert into public.services (tenant_id, category_id, kind, name, description, species, sort_order)
select c.tenant_id, c.id, s.kind::public.service_kind, s.name, s.description, s.species::public.service_species, s.sort_order
from categories c
join (
  values
    ('Higiene', 'bath', 'Baño', 'Baño completo con secado y detalles.', 'both', 1),
    ('Higiene', 'other', 'Corte de uñas', 'Corte y limado de uñas.', 'both', 3),
    ('Estilo', 'special_cut', 'Corte de raza', 'Corte especial hecho por el groomer.', 'dog', 2)
) as s (category, kind, name, description, species, sort_order) on s.category = c.name;

insert into public.extras (tenant_id, service_id, name, extra_minutes)
select s.tenant_id, s.id, e.name, e.minutes
from public.services s
join public.tenants t on t.id = s.tenant_id and t.slug in ('spaperrunosygatunos', 'demo')
cross join (values ('Cepillado profundo', 10), ('Limpieza de oídos', 0)) as e (name, minutes)
where s.name = 'Baño'
on conflict do nothing;

with combos as (
  select size, coat, size_idx, coat_idx
  from unnest(enum_range(null::public.pet_size)) with ordinality as z (size, size_idx)
  cross join unnest(enum_range(null::public.coat_type)) with ordinality as c (coat, coat_idx)
), svc as (
  select s.* from public.services s
  join public.tenants t on t.id = s.tenant_id and t.slug in ('spaperrunosygatunos', 'demo')
)
insert into public.service_durations (tenant_id, service_id, size, coat, bath_min, dry_min, details_min, cut_min)
select svc.tenant_id, svc.id, combos.size, combos.coat,
  case when svc.kind = 'bath' then 25 + 5 * combos.size_idx::int + 5 * (combos.coat_idx::int - 1) end,
  case when svc.kind = 'bath' then 15 + 5 * combos.size_idx::int + 5 * (combos.coat_idx::int - 1) end,
  case when svc.kind = 'bath' then 15 + 5 * (combos.size_idx::int / 2)
       when svc.kind = 'other' then 15 end,
  case when svc.kind = 'special_cut' then 40 + 10 * combos.size_idx::int end
from svc cross join combos
on conflict do nothing;

with combos as (
  select size, coat, size_idx, coat_idx
  from unnest(enum_range(null::public.pet_size)) with ordinality as z (size, size_idx)
  cross join unnest(enum_range(null::public.coat_type)) with ordinality as c (coat, coat_idx)
), sede as (
  select l.id as location_id, l.tenant_id from public.locations l
  join public.tenants t on t.id = l.tenant_id and t.slug in ('spaperrunosygatunos', 'demo')
  where l.name = 'Sede principal'
)
insert into public.location_service_prices (tenant_id, location_id, service_id, size, coat, price_cop)
select sede.tenant_id, sede.location_id, s.id, combos.size, combos.coat,
  case s.kind
    when 'bath' then 30000 + 8000 * combos.size_idx::int + 5000 * (combos.coat_idx::int - 1)
    when 'special_cut' then 40000 + 10000 * combos.size_idx::int
    else 12000
  end
from sede
join public.services s on s.tenant_id = sede.tenant_id
cross join combos
on conflict do nothing;

with combos as (
  select size, coat, size_idx
  from unnest(enum_range(null::public.pet_size)) with ordinality as z (size, size_idx)
  cross join unnest(enum_range(null::public.coat_type)) as c (coat)
)
insert into public.location_extra_prices (tenant_id, location_id, extra_id, size, coat, price_cop)
select e.tenant_id, l.id, e.id, combos.size, combos.coat, 5000 + 1000 * combos.size_idx::int
from public.extras e
join public.locations l on l.tenant_id = e.tenant_id and l.name = 'Sede principal'
join public.tenants t on t.id = e.tenant_id and t.slug in ('spaperrunosygatunos', 'demo')
cross join combos
on conflict do nothing;

-- Opcionales sin costo del Baño (D26).
insert into public.service_options (tenant_id, service_id, name, stage, sort_order)
select s.tenant_id, s.id, o.name, o.stage::public.option_stage, o.sort_order
from public.services s
join public.tenants t on t.id = s.tenant_id and t.slug in ('spaperrunosygatunos', 'demo')
cross join (
  values ('Shampoo hipoalergénico', 'bath', 1), ('Corte higiénico', 'details', 2),
         ('Perfume', 'details', 3), ('Tijera en patas', 'details', 4)
) as o (name, stage, sort_order)
where s.name = 'Baño'
on conflict do nothing;
