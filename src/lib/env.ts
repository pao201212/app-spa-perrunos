import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_COOKIE_DOMAIN: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
});

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  /** Dominio de la cookie de sesión (p. ej. ".prismalab.com.co") para compartirla entre subdominios. */
  cookieDomain: string | undefined;
};

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas o faltantes: ${fields}. Revisa .env.example`);
  }
  return {
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    cookieDomain: result.data.NEXT_PUBLIC_COOKIE_DOMAIN,
  };
}

// Next.js solo inyecta variables NEXT_PUBLIC_* en el navegador cuando se leen de forma literal.
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  });
}
