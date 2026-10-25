-- Datos de desarrollo y tests. Se aplica con `npm run db:reset`.

insert into public.tenants (slug, name)
values
  ('spaperrunosygatunos', 'Spa Perrunos y Gatunos'),
  ('demo', 'Spa Demo')
on conflict (slug) do nothing;
