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
