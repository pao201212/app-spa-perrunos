import { PLATFORM_THEME, tenantThemeHref } from "./paths";

/**
 * Hojas de estilos del tema. React las ubica en <head> y retrasa la revelación del contenido
 * hasta que cargan (sin flash de estilos), incluso dentro de un Suspense.
 * El tema de Prisma Lab va primero como respaldo: un spa recién creado, cuyo theme.css aún no
 * está en el repo, se ve con estilos completos en lugar de sin tokens.
 */
export function ThemeStylesheet({ slug }: { slug: string }) {
  return (
    <>
      <link rel="stylesheet" href={tenantThemeHref(PLATFORM_THEME)} precedence="theme-base" />
      {slug !== PLATFORM_THEME && (
        <link rel="stylesheet" href={tenantThemeHref(slug)} precedence="theme" />
      )}
    </>
  );
}
