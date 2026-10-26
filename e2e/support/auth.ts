import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Opción aprobada: los tests no pasan por Google. Crean el usuario con la secret key,
// inician sesión con contraseña y copian las cookies de sesión (@supabase/ssr) al navegador.
// La app no tiene ninguna ruta de "login de prueba".

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}: ejecuta \`npm run db:start\` y revisa .env.local`);
  return value;
}

const admin = () =>
  createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export type E2EUser = { id: string; email: string; password: string };

export async function createE2EUser(label: string): Promise<E2EUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@e2e.prismalab.local`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("No se pudo crear el usuario E2E");
  return { id: data.user.id, email, password };
}

export async function deleteE2EUser(user: E2EUser | undefined): Promise<void> {
  if (user) await admin().auth.admin.deleteUser(user.id);
}

/** Inyecta en el contexto del navegador las cookies de sesión del usuario para `host`. */
export async function signInAs(
  context: BrowserContext,
  user: E2EUser,
  host: string,
): Promise<void> {
  const cookies: { name: string; value: string }[] = [];
  const supabase = createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => cookies,
        setAll: (toSet) => {
          for (const { name, value } of toSet) {
            const index = cookies.findIndex((c) => c.name === name);
            if (index >= 0) cookies.splice(index, 1);
            if (value) cookies.push({ name, value });
          }
        },
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
  if (cookies.length === 0) throw new Error("Supabase no escribió cookies de sesión");

  await context.addCookies(
    cookies.map(({ name, value }) => ({
      name,
      value,
      domain: host,
      path: "/",
      sameSite: "Lax" as const,
    })),
  );
}

/** Da al usuario una membresía de admin en el spa `slug`. */
export async function grantMembership(user: E2EUser, slug: string): Promise<void> {
  const client = admin();
  const { data: tenant, error } = await client
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const { error: insertError } = await client
    .from("memberships")
    .insert({ tenant_id: tenant.id, user_id: user.id, role: "admin" });
  if (insertError) throw insertError;
}

export async function grantSuperAdmin(user: E2EUser): Promise<void> {
  const { error } = await admin().from("platform_admins").insert({ user_id: user.id });
  if (error) throw error;
}

/** Limpieza: borra un spa creado durante un test (en cascada borra membresías e invitaciones). */
export async function deleteTenantBySlug(slug: string): Promise<void> {
  await admin().from("tenants").delete().eq("slug", slug);
}

export async function deleteInvite(email: string): Promise<void> {
  await admin().from("tenant_invites").delete().eq("email", email);
}

export async function deleteGlobalBreedByName(name: string): Promise<void> {
  await admin().from("global_breeds").delete().eq("name", name);
}

export async function deleteLocationByName(name: string): Promise<void> {
  await admin().from("locations").delete().eq("name", name);
}

/** Crea un local mínimo en el spa `slug` y devuelve su id. */
export async function createLocation(slug: string, name: string): Promise<string> {
  const client = admin();
  const { data: tenant, error } = await client
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const { data, error: insertError } = await client
    .from("locations")
    .insert({ tenant_id: tenant.id, name })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return data.id;
}

/** Spa temporal y aislado para tests que modifican varios locales a la vez. */
export async function createTenant(slug: string, name: string): Promise<string> {
  const { data, error } = await admin()
    .from("tenants")
    .insert({ slug, name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Estaciones (2 tinas, 2 mesas, una con corte) y horario de lunes 08:00-12:30 en un local. */
export async function seedLocationConfig(slug: string, locationId: string): Promise<void> {
  const client = admin();
  const { data: tenant, error } = await client
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const base = { tenant_id: tenant.id, location_id: locationId };
  const stations = await client.from("stations").insert([
    { ...base, name: "Tina 1", kind: "tub", for_special_cut: false },
    { ...base, name: "Tina 2", kind: "tub", for_special_cut: false },
    { ...base, name: "Mesa 1", kind: "table", for_special_cut: true },
    { ...base, name: "Mesa 2", kind: "table", for_special_cut: false },
  ]);
  if (stations.error) throw stations.error;
  const hours = await client
    .from("location_hours")
    .insert({ ...base, weekday: 1, opens_at: "08:00", closes_at: "12:30" });
  if (hours.error) throw hours.error;
}

/** Cliente con mascotas (Pug) en el spa `slug`; devuelve el id del cliente. */
export async function createCustomerWithPets(
  slug: string,
  fullName: string,
  petNames: string[],
): Promise<string> {
  const client = admin();
  const { data: tenant, error } = await client
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const { data: customer, error: customerError } = await client
    .from("customers")
    .insert({
      tenant_id: tenant.id,
      full_name: fullName,
      whatsapp: `+57 3${Date.now().toString().slice(-9)}`,
    })
    .select("id")
    .single();
  if (customerError) throw customerError;
  const { data: breed } = await client
    .from("tenant_breeds")
    .select("id")
    .match({ tenant_id: tenant.id, name: "Pug" })
    .single();
  const pets = await client.from("pets").insert(
    petNames.map((name) => ({
      tenant_id: tenant.id,
      customer_id: customer.id,
      name,
      species: "dog" as const,
      breed_id: breed!.id,
    })),
  );
  if (pets.error) throw pets.error;
  return customer.id;
}

/** Servicio en el spa `slug`; devuelve su id. */
export async function createService(
  slug: string,
  name: string,
  kind: "bath" | "special_cut" | "other" = "bath",
): Promise<string> {
  const client = admin();
  const { data: tenant, error } = await client
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  const { data, error: insertError } = await client
    .from("services")
    .insert({ tenant_id: tenant.id, name, kind, species: "both" })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return data.id;
}

/** Duraciones de baño (40/30/20) para las combinaciones indicadas. */
export async function seedBathDurations(
  serviceId: string,
  combos: { size: string; coat: string }[],
): Promise<void> {
  const client = admin();
  const { data: service, error } = await client
    .from("services")
    .select("tenant_id")
    .eq("id", serviceId)
    .single();
  if (error) throw error;
  const rows = combos.map(({ size, coat }) => ({
    tenant_id: service.tenant_id,
    service_id: serviceId,
    size: size as "M",
    coat: coat as "short",
    bath_min: 40,
    dry_min: 30,
    details_min: 20,
  }));
  const insert = await client.from("service_durations").insert(rows);
  if (insert.error) throw insert.error;
}

export async function createExtra(serviceId: string, name: string): Promise<string> {
  const client = admin();
  const { data: service, error } = await client
    .from("services")
    .select("tenant_id")
    .eq("id", serviceId)
    .single();
  if (error) throw error;
  const { data, error: insertError } = await client
    .from("extras")
    .insert({ tenant_id: service.tenant_id, service_id: serviceId, name })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return data.id;
}
