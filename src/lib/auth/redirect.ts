export const AUTH_CALLBACK_PATH = "/auth/callback";
export const LOGIN_PATH = "/ingresar";

/**
 * Destino post-login seguro: solo rutas internas del mismo host.
 * Cualquier otra cosa (URLs absolutas, `//host`, `/\host`, caracteres de control) vuelve a "/".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(next)) return "/";
  return next;
}

/** URL a la que Google/Supabase devuelve al usuario: /auth/callback del host actual. */
export function callbackUrl(origin: string, next: string | null | undefined): string {
  const url = new URL(AUTH_CALLBACK_PATH, origin);
  url.searchParams.set("next", safeNextPath(next));
  return url.toString();
}
