import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

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

/** Conexión directa a Postgres (rol postgres) para inspeccionar el esquema y simular roles. */
export function sqlClient() {
  return postgres(requireEnv("SUPABASE_DB_URL"), { max: 1, onnotice: () => undefined });
}

/**
 * Ejecuta `fn` dentro de una transacción con el rol y las claims de un usuario, como lo haría PostgREST.
 * Siempre hace rollback: nada de lo que pase dentro persiste.
 */
export async function asRole<T>(
  sql: postgres.Sql,
  claims: { role: "anon" | "authenticated"; sub?: string },
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  await sql
    .begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
      await tx.unsafe(`set local role ${claims.role}`);
      result = await fn(tx);
      throw new Rollback();
    })
    .catch((error) => {
      if (!(error instanceof Rollback)) throw error;
    });
  return result as T;
}

class Rollback extends Error {}
