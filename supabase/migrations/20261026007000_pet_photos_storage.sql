-- T26 · Fotos de mascotas en un bucket PRIVADO (el legado usaba uno público, SPEC §1).
-- Ruta obligatoria: {tenant_id}/pets/{pet_id}/{archivo}. Lectura con URLs firmadas.
-- Acceso: el dueño de la mascota y el staff del spa.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-files', 'tenant-files', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.can_access_pet_file(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(p_object_name, '/');
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if cardinality(v_parts) <> 4 or v_parts[2] <> 'pets'
     or v_parts[1] !~ v_uuid or v_parts[3] !~ v_uuid or v_parts[4] = '' then
    return false;
  end if;

  return exists (
    select 1 from public.pets p
    where p.id = v_parts[3]::uuid
      and p.tenant_id = v_parts[1]::uuid
      and (private.is_tenant_staff(p.tenant_id) or private.is_own_customer(p.customer_id))
  );
end;
$$;

revoke all on function private.can_access_pet_file(text) from public;
grant execute on function private.can_access_pet_file(text) to authenticated, service_role;

create policy "tenant_files_pet_photos_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'tenant-files' and (select private.can_access_pet_file(name)));

create policy "tenant_files_pet_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tenant-files' and (select private.can_access_pet_file(name)));

create policy "tenant_files_pet_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'tenant-files' and (select private.can_access_pet_file(name)))
  with check (bucket_id = 'tenant-files' and (select private.can_access_pet_file(name)));

create policy "tenant_files_pet_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tenant-files' and (select private.can_access_pet_file(name)));
