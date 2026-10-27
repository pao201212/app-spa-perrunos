import { parseCop } from "@/lib/money";
import type { CoatType, PetSize } from "@/lib/pets/labels";

export type Combo = { readonly size: PetSize; readonly coat: CoatType };

/** Nombre del campo de precio. `item` distingue el servicio de cada extra en el mismo formulario. */
export const priceFieldName = (item: string, size: PetSize, coat: CoatType) =>
  `p.${item}.${size}.${coat}`;

/**
 * Lee la matriz de precios de un ítem (servicio o extra) para las combinaciones que el servicio
 * ofrece (las que tienen duración). Todo lleno = se ofrece en el local; todo vacío = no se ofrece;
 * a medias = error en las celdas faltantes.
 */
export function parsePriceMatrix(item: string, formData: FormData, offered: readonly Combo[]) {
  const cells = offered.map((combo) => {
    const field = priceFieldName(item, combo.size, combo.coat);
    return { ...combo, field, raw: String(formData.get(field) ?? "").trim() };
  });
  const errors: Record<string, string> = {};
  if (cells.every((cell) => cell.raw === "")) return { rows: [], errors };

  const rows: (Combo & { price_cop: number })[] = [];
  for (const cell of cells) {
    if (cell.raw === "") {
      errors[cell.field] = "Falta el precio: completa todas las combinaciones o deja todo vacío";
      continue;
    }
    const price = parseCop(cell.raw);
    if (price === null) {
      errors[cell.field] = "Escribe un precio en pesos";
      continue;
    }
    rows.push({ size: cell.size, coat: cell.coat, price_cop: price });
  }
  return { rows, errors };
}
