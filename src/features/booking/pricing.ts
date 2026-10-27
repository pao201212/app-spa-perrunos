import type { CoatType, PetSize, Species } from "@/lib/pets/labels";

// Lógica del asistente de reserva para mostrar opciones y precios. La disponibilidad y el total
// definitivo los decide capacity.book (SQL); aquí solo se arma lo que el cliente ve.

export type ServiceKind = "bath" | "special_cut" | "other";

type PriceRow = { location_id: string; size: PetSize; coat: CoatType; price_cop: number };

export type BookingCatalog = {
  services: {
    id: string;
    name: string;
    kind: ServiceKind;
    species: "dog" | "cat" | "both";
    description: string | null;
  }[];
  extras: { id: string; service_id: string; name: string; extra_minutes: number }[];
  options: { id: string; service_id: string; name: string; stage: "bath" | "details" }[];
  locations: { id: string; name: string; address: string | null; max_days_ahead: number }[];
  servicePrices: (PriceRow & { service_id: string })[];
  extraPrices: (PriceRow & { extra_id: string })[];
};

export type BookingPet = {
  id: string;
  name: string;
  species: Species;
  size: PetSize;
  coat: CoatType;
};

export type PetSelection = {
  petId: string;
  serviceId: string | null;
  cutId: string | null;
  extras: string[];
  options: string[];
};

export const emptySelection = (petId: string): PetSelection => ({
  petId,
  serviceId: null,
  cutId: null,
  extras: [],
  options: [],
});

type Item = { kind: "service" | "extra"; id: string };

const pricesFor = (catalog: BookingCatalog, item: Item, pet: BookingPet) =>
  item.kind === "service"
    ? catalog.servicePrices.filter(
        (p) => p.service_id === item.id && p.size === pet.size && p.coat === pet.coat,
      )
    : catalog.extraPrices.filter(
        (p) => p.extra_id === item.id && p.size === pet.size && p.coat === pet.coat,
      );

/** Precio en un local, o undefined si ese local no lo ofrece para la talla y el pelo. */
export function priceAt(catalog: BookingCatalog, locationId: string, item: Item, pet: BookingPet) {
  return pricesFor(catalog, item, pet).find((p) => p.location_id === locationId)?.price_cop;
}

/** Precio más bajo entre los locales (para "desde $X"), o undefined si ninguno lo ofrece. */
export function fromPrice(catalog: BookingCatalog, item: Item, pet: BookingPet) {
  const prices = pricesFor(catalog, item, pet).map((p) => p.price_cop);
  return prices.length > 0 ? Math.min(...prices) : undefined;
}

const fitsSpecies = (service: BookingCatalog["services"][number], pet: BookingPet) =>
  service.species === "both" || service.species === pet.species;

/** Servicios que algún local ofrece para la mascota, con su precio "desde". */
export function servicesFor(catalog: BookingCatalog, pet: BookingPet, kinds: ServiceKind[]) {
  return catalog.services
    .filter((s) => kinds.includes(s.kind) && fitsSpecies(s, pet))
    .map((s) => ({ ...s, fromPrice: fromPrice(catalog, { kind: "service", id: s.id }, pet) }))
    .filter((s): s is typeof s & { fromPrice: number } => s.fromPrice !== undefined);
}

export const selectedServiceIds = (selection: PetSelection) =>
  [selection.serviceId, selection.cutId].filter((id): id is string => !!id);

/** Adicionales con costo de los servicios elegidos que algún local ofrece para la mascota. */
export function extrasFor(catalog: BookingCatalog, pet: BookingPet, selection: PetSelection) {
  const services = selectedServiceIds(selection);
  return catalog.extras
    .filter((e) => services.includes(e.service_id))
    .map((e) => ({ ...e, fromPrice: fromPrice(catalog, { kind: "extra", id: e.id }, pet) }))
    .filter((e): e is typeof e & { fromPrice: number } => e.fromPrice !== undefined);
}

/** Opcionales sin costo del baño elegido (D26). */
export function optionsFor(catalog: BookingCatalog, selection: PetSelection) {
  return catalog.options.filter((o) => o.service_id === selection.serviceId);
}

/**
 * Cambia el servicio principal: si deja de ser un baño, se quitan el corte especial y los
 * opcionales; los adicionales que no correspondan también se quitan.
 */
export function chooseService(
  catalog: BookingCatalog,
  selection: PetSelection,
  serviceId: string,
): PetSelection {
  const isBath = catalog.services.find((s) => s.id === serviceId)?.kind === "bath";
  const next = { ...selection, serviceId, cutId: isBath ? selection.cutId : null, options: [] };
  const allowed = new Set(selectedServiceIds(next));
  const extras = selection.extras.filter((id) =>
    allowed.has(catalog.extras.find((e) => e.id === id)?.service_id ?? ""),
  );
  return { ...next, extras };
}

export type QuoteLine = { petId: string; name: string; price: number };

/**
 * Total de la reserva en un local. `missing` lista lo que ese local no ofrece para la talla y el
 * pelo de alguna mascota: con algo faltante, el local no se puede elegir.
 */
export function quote(
  catalog: BookingCatalog,
  locationId: string,
  pets: BookingPet[],
  selections: PetSelection[],
) {
  const lines: QuoteLine[] = [];
  const missing: string[] = [];
  for (const selection of selections) {
    const pet = pets.find((p) => p.id === selection.petId);
    if (!pet) continue;
    const items: (Item & { name: string })[] = [
      ...selectedServiceIds(selection).map((id) => ({
        kind: "service" as const,
        id,
        name: catalog.services.find((s) => s.id === id)?.name ?? "",
      })),
      ...selection.extras.map((id) => ({
        kind: "extra" as const,
        id,
        name: catalog.extras.find((e) => e.id === id)?.name ?? "",
      })),
    ];
    for (const item of items) {
      const price = priceAt(catalog, locationId, item, pet);
      if (price === undefined) missing.push(`${item.name} (${pet.name})`);
      else lines.push({ petId: pet.id, name: item.name, price });
    }
  }
  return { lines, missing, total: lines.reduce((sum, line) => sum + line.price, 0) };
}

/** Mascotas para available_slots / book_appointment. */
export const toBookingPets = (selections: PetSelection[]) =>
  selections.map((s) => ({
    pet_id: s.petId,
    services: selectedServiceIds(s),
    extras: s.extras,
    options: s.options,
  }));
