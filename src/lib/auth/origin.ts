/** Origen público de la petición (el host del spa, no el de la ruta interna reescrita). */
export function requestOrigin(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost";
  const isLocal = /(^|\.)localhost(:\d+)?$/.test(host) || host.startsWith("127.0.0.1");
  const proto = headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
