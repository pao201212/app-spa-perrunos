/** Slug del tema de Prisma Lab (consola y páginas sin tenant). Es un subdominio reservado. */
export const PLATFORM_THEME = "platform";

export const tenantThemeHref = (slug: string) => `/tenants/${slug}/theme.css`;
export const tenantFaviconHref = (slug: string) => `/tenants/${slug}/assets/favicon.png`;
