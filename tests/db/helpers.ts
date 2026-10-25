import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}. Ejecuta \`npm run db:start\` y revisa .env.local`);
  return value;
}

const url = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = () => requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Cliente con la secret key: ignora RLS. Solo para preparar y limpiar datos de prueba. */
export function adminClient(): SupabaseClient {
  return createClient(url(), requireEnv("SUPABASE_SECRET_KEY"), noSession);
}

/** Cliente sin sesión (rol `anon`). */
export function anonClient(): SupabaseClient {
  return createClient(url(), publishableKey(), noSession);
}

/** Sufijo único para que cada corrida use sus propios datos. */
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

export type TestUser = { id: string; email: string; client: SupabaseClient };

/** Crea un usuario confirmado y devuelve un cliente autenticado como él (rol `authenticated`). */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `${label}-${uniqueSuffix()}@test.prismalab.local`;
  const password = `pw-${randomUUID()}`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("No se pudo crear el usuario de prueba");

  const client = createClient(url(), publishableKey(), noSession);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, email, client };
}

export async function deleteTestUsers(users: TestUser[]): Promise<void> {
  const admin = adminClient();
  await Promise.all(users.map((u) => admin.auth.admin.deleteUser(u.id)));
}
