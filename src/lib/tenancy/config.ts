/** Dominio raíz de los subdominios de los spas. Producción: prismalab.com.co. */
export function getRootDomain(): string {
  return process.env.ROOT_DOMAIN || "localhost";
}
