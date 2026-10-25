import { tenantThemeHref } from "./paths";

/**
 * Hoja de estilos del tema. React la ubica en <head> y retrasa la revelación del contenido
 * hasta que carga (sin flash de estilos), incluso si se renderiza dentro de un Suspense.
 */
export function ThemeStylesheet({ slug }: { slug: string }) {
  return <link rel="stylesheet" href={tenantThemeHref(slug)} precedence="theme" />;
}
