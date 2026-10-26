-- T17 · Catálogo global de razas (plataforma). Cada spa lo hereda y lo ajusta (T21-T22).
-- Datos de referencia necesarios también en producción: van en la migración, no en seed.sql.

create type public.pet_species as enum ('dog', 'cat');
create type public.pet_size as enum ('XS', 'S', 'M', 'L', 'XL', 'XXL');
create type public.coat_type as enum ('short', 'medium', 'long');

create table public.global_breeds (
  id uuid primary key default gen_random_uuid(),
  species public.pet_species not null,
  name text not null check (length(trim(name)) > 0),
  default_size public.pet_size not null,
  default_coat public.coat_type not null,
  -- Criollo/mestizo: la talla sale del peso y el cliente elige el pelo (D9).
  is_mixed boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index global_breeds_species_name_key on public.global_breeds (species, lower(name));
create unique index global_breeds_one_mixed_per_species on public.global_breeds (species) where is_mixed;

comment on table public.global_breeds is 'Catálogo de razas de Prisma Lab. Solo el super admin lo edita.';

alter table public.global_breeds enable row level security;

create policy "global_breeds_select_all" on public.global_breeds
  for select to anon, authenticated
  using (true);

create policy "global_breeds_insert_super_admin" on public.global_breeds
  for insert to authenticated
  with check ((select private.is_super_admin()));

create policy "global_breeds_update_super_admin" on public.global_breeds
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

create policy "global_breeds_delete_super_admin" on public.global_breeds
  for delete to authenticated
  using ((select private.is_super_admin()));

-- Razas del repo legado PetSpa (supabase_production_setup.sql), traducidas al nuevo modelo.
insert into public.global_breeds (species, name, default_size, default_coat, is_mixed) values
  ('cat', 'Abisinio', 'M', 'short', false),
  ('cat', 'American Bobtail', 'M', 'medium', false),
  ('cat', 'American Shorthair', 'M', 'short', false),
  ('cat', 'American Wirehair', 'M', 'short', false),
  ('cat', 'Angora Turco', 'M', 'long', false),
  ('cat', 'Azul Ruso', 'M', 'short', false),
  ('cat', 'Balinés', 'M', 'long', false),
  ('cat', 'Bengalí', 'L', 'short', false),
  ('cat', 'Birmano', 'M', 'long', false),
  ('cat', 'Bombay', 'M', 'short', false),
  ('cat', 'British Shorthair', 'L', 'short', false),
  ('cat', 'Burmés', 'M', 'short', false),
  ('cat', 'Chartreux', 'L', 'short', false),
  ('cat', 'Cornish Rex', 'S', 'short', false),
  ('cat', 'Criollo / Mestizo', 'S', 'short', true),
  ('cat', 'Devon Rex', 'S', 'short', false),
  ('cat', 'Egyptian Mau', 'M', 'short', false),
  ('cat', 'Exótico de Pelo Corto', 'M', 'short', false),
  ('cat', 'Habano', 'M', 'short', false),
  ('cat', 'Himalayo', 'L', 'long', false),
  ('cat', 'Javanés', 'M', 'long', false),
  ('cat', 'Korat', 'M', 'short', false),
  ('cat', 'LaPerm', 'M', 'medium', false),
  ('cat', 'Maine Coon', 'XL', 'long', false),
  ('cat', 'Manx', 'M', 'short', false),
  ('cat', 'Munchkin', 'XS', 'short', false),
  ('cat', 'Nebelung', 'M', 'long', false),
  ('cat', 'Noruego de Bosque', 'XL', 'long', false),
  ('cat', 'Ocicat', 'L', 'short', false),
  ('cat', 'Oriental', 'M', 'short', false),
  ('cat', 'Persa', 'L', 'long', false),
  ('cat', 'Ragamuffin', 'XL', 'long', false),
  ('cat', 'Ragdoll', 'XL', 'long', false),
  ('cat', 'Siamés', 'M', 'short', false),
  ('cat', 'Siberiano', 'L', 'long', false),
  ('cat', 'Singapura', 'XS', 'short', false),
  ('cat', 'Snowshoe', 'M', 'short', false),
  ('cat', 'Somalí', 'M', 'long', false),
  ('cat', 'Sphynx (Esfinge)', 'M', 'short', false),
  ('cat', 'Tonquinés', 'M', 'short', false),
  ('cat', 'Toyger', 'M', 'short', false),
  ('cat', 'Van Turco', 'L', 'long', false),
  ('dog', 'Affenpinscher', 'S', 'long', false),
  ('dog', 'Airedale Terrier', 'L', 'long', false),
  ('dog', 'Akita', 'L', 'medium', false),
  ('dog', 'Alaskan Malamute', 'XL', 'long', false),
  ('dog', 'American Bulldog', 'L', 'short', false),
  ('dog', 'American Eskimo Dog', 'M', 'long', false),
  ('dog', 'American Pit Bull Terrier', 'M', 'short', false),
  ('dog', 'American Staffordshire Terrier', 'M', 'short', false),
  ('dog', 'Australian Cattle Dog', 'M', 'short', false),
  ('dog', 'Australian Shepherd', 'M', 'long', false),
  ('dog', 'Australian Terrier', 'S', 'long', false),
  ('dog', 'Basenji', 'S', 'short', false),
  ('dog', 'Basset Hound', 'M', 'short', false),
  ('dog', 'Beagle', 'S', 'short', false),
  ('dog', 'Belgian Malinois', 'L', 'short', false),
  ('dog', 'Belgian Tervuren', 'L', 'long', false),
  ('dog', 'Bernese Mountain Dog', 'XL', 'long', false),
  ('dog', 'Bichon Frise', 'S', 'long', false),
  ('dog', 'Bloodhound', 'L', 'short', false),
  ('dog', 'Border Collie', 'L', 'long', false),
  ('dog', 'Border Terrier', 'S', 'long', false),
  ('dog', 'Borzoi', 'L', 'long', false),
  ('dog', 'Boston Terrier', 'S', 'short', false),
  ('dog', 'Boxer', 'L', 'short', false),
  ('dog', 'Brittany', 'M', 'short', false),
  ('dog', 'Brussels Griffon', 'S', 'long', false),
  ('dog', 'Bull Terrier', 'M', 'short', false),
  ('dog', 'Bulldog Francés', 'S', 'short', false),
  ('dog', 'Bulldog Inglés', 'M', 'short', false),
  ('dog', 'Bullmastiff', 'XXL', 'short', false),
  ('dog', 'Cairn Terrier', 'S', 'long', false),
  ('dog', 'Cane Corso', 'XXL', 'short', false),
  ('dog', 'Cardigan Welsh Corgi', 'S', 'medium', false),
  ('dog', 'Cavalier King Charles Spaniel', 'S', 'long', false),
  ('dog', 'Chesapeake Bay Retriever', 'L', 'medium', false),
  ('dog', 'Chihuahua', 'XS', 'short', false),
  ('dog', 'Chinese Crested', 'S', 'long', false),
  ('dog', 'Chinese Shar-Pei', 'M', 'short', false),
  ('dog', 'Chow Chow', 'M', 'long', false),
  ('dog', 'Cocker Spaniel', 'M', 'long', false),
  ('dog', 'Collie', 'L', 'long', false),
  ('dog', 'Criollo / Mestizo', 'M', 'short', true),
  ('dog', 'Dachshund (Teckel)', 'S', 'short', false),
  ('dog', 'Dalmatian', 'L', 'short', false),
  ('dog', 'Doberman Pinscher', 'L', 'short', false),
  ('dog', 'Dogo Argentino', 'L', 'short', false),
  ('dog', 'English Cocker Spaniel', 'M', 'long', false),
  ('dog', 'English Setter', 'L', 'long', false),
  ('dog', 'English Springer Spaniel', 'M', 'long', false),
  ('dog', 'Flat-Coated Retriever', 'L', 'long', false),
  ('dog', 'German Shepherd (Pastor Alemán)', 'L', 'medium', false),
  ('dog', 'German Shorthaired Pointer', 'L', 'short', false),
  ('dog', 'German Wirehaired Pointer', 'L', 'long', false),
  ('dog', 'Giant Schnauzer', 'XL', 'long', false),
  ('dog', 'Golden Retriever', 'L', 'long', false),
  ('dog', 'Gordon Setter', 'L', 'long', false),
  ('dog', 'Great Dane (Gran Danés)', 'XL', 'short', false),
  ('dog', 'Great Pyrenees', 'XL', 'long', false),
  ('dog', 'Greyhound', 'L', 'short', false),
  ('dog', 'Havanese', 'S', 'long', false),
  ('dog', 'Irish Setter', 'L', 'long', false),
  ('dog', 'Irish Wolfhound', 'XL', 'short', false),
  ('dog', 'Italian Greyhound', 'S', 'short', false),
  ('dog', 'Jack Russell Terrier', 'S', 'short', false),
  ('dog', 'Japanese Chin', 'S', 'long', false),
  ('dog', 'Keeshond', 'M', 'long', false),
  ('dog', 'Labrador Retriever', 'L', 'short', false),
  ('dog', 'Lhasa Apso', 'S', 'long', false),
  ('dog', 'Maltese', 'S', 'long', false),
  ('dog', 'Mastiff', 'XL', 'short', false),
  ('dog', 'Miniature Pinscher', 'S', 'short', false),
  ('dog', 'Miniature Schnauzer', 'S', 'long', false),
  ('dog', 'Newfoundland (Terranova)', 'XL', 'long', false),
  ('dog', 'Norfolk Terrier', 'S', 'long', false),
  ('dog', 'Old English Sheepdog', 'L', 'long', false),
  ('dog', 'Papillon', 'S', 'long', false),
  ('dog', 'Pekingese', 'S', 'long', false),
  ('dog', 'Pembroke Welsh Corgi', 'S', 'medium', false),
  ('dog', 'Pointer', 'L', 'short', false),
  ('dog', 'Pomeranian', 'S', 'long', false),
  ('dog', 'Poodle (Caniche)', 'M', 'long', false),
  ('dog', 'Portuguese Water Dog', 'M', 'long', false),
  ('dog', 'Pug', 'S', 'short', false),
  ('dog', 'Rat Terrier', 'S', 'short', false),
  ('dog', 'Rhodesian Ridgeback', 'L', 'short', false),
  ('dog', 'Rottweiler', 'L', 'short', false),
  ('dog', 'Saint Bernard (San Bernardo)', 'XL', 'long', false),
  ('dog', 'Samoyed', 'L', 'long', false),
  ('dog', 'Schipperke', 'S', 'short', false),
  ('dog', 'Scottish Terrier', 'S', 'long', false),
  ('dog', 'Shetland Sheepdog', 'S', 'long', false),
  ('dog', 'Shiba Inu', 'S', 'medium', false),
  ('dog', 'Shih Tzu', 'S', 'long', false),
  ('dog', 'Siberian Husky', 'M', 'long', false),
  ('dog', 'Soft Coated Wheaten Terrier', 'M', 'long', false),
  ('dog', 'Staffordshire Bull Terrier', 'M', 'short', false),
  ('dog', 'Standard Schnauzer', 'M', 'long', false),
  ('dog', 'Vizsla', 'L', 'short', false),
  ('dog', 'Weimaraner', 'L', 'short', false),
  ('dog', 'Welsh Terrier', 'S', 'long', false),
  ('dog', 'West Highland White Terrier', 'S', 'long', false),
  ('dog', 'Whippet', 'M', 'short', false),
  ('dog', 'Yorkshire Terrier', 'XS', 'long', false);
