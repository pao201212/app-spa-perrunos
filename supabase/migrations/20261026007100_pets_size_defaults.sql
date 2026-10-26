-- T26 · size y coat los calcula private.compute_pet_size() en cada insert/update.
-- Los defaults solo hacen que los clientes no tengan que enviar un valor que se va a reemplazar.
alter table public.pets alter column size set default 'M';
alter table public.pets alter column coat set default 'short';
