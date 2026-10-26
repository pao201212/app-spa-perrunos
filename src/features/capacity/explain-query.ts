import { z } from "zod";

import { COAT_TYPES, PET_SIZES, SPECIES } from "@/lib/pets/labels";

/** Filtros de "¿Por qué no hay cupo?" desde la URL (formulario GET). */
export const explainQuerySchema = z.object({
  date: z.iso.date(),
  species: z.enum(SPECIES).default("dog"),
  size: z.enum(PET_SIZES).default("M"),
  coat: z.enum(COAT_TYPES).default("short"),
  service: z.uuid(),
  cut: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
});

export type ExplainQuery = z.infer<typeof explainQuerySchema>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Lee los filtros; sin servicio válido, devuelve null y la página solo muestra el formulario. */
export function parseExplainQuery(
  params: Record<string, string | string[] | undefined>,
  today: string,
): { query: ExplainQuery | null; date: string } {
  const raw = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, first(value)]));
  const date = z.iso.date().safeParse(raw.date).data ?? today;
  const parsed = explainQuerySchema.safeParse({ ...raw, date });
  return { query: parsed.success ? parsed.data : null, date };
}
