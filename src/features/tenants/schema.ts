import { z } from "zod";

import { isValidTenantSlug } from "@/lib/tenancy/host";

const timeZones = new Set(Intl.supportedValuesOf("timeZone"));

export const tenantFormSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del spa").max(80, "Máximo 80 caracteres"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      isValidTenantSlug,
      "Usa minúsculas, números y guiones (sin palabras reservadas como admin o www)",
    ),
  timezone: z.string().refine((tz) => timeZones.has(tz), "Zona horaria no válida"),
  currency: z.string().regex(/^[A-Z]{3}$/, "Usa un código ISO de 3 letras, p. ej. COP"),
});

export type TenantForm = z.infer<typeof tenantFormSchema>;

export const assignAdminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido")),
});
