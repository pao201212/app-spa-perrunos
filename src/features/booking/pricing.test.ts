import { describe, expect, it } from "vitest";

import {
  chooseService,
  emptySelection,
  extrasFor,
  optionsFor,
  quote,
  servicesFor,
  toBookingPets,
  type BookingCatalog,
  type BookingPet,
} from "./pricing";

const NORTE = "loc-norte";
const SUR = "loc-sur";

const catalog: BookingCatalog = {
  services: [
    { id: "bano", name: "Baño", kind: "bath", species: "both", description: null },
    { id: "unas", name: "Corte de uñas", kind: "other", species: "dog", description: null },
    { id: "corte", name: "Corte de raza", kind: "special_cut", species: "dog", description: null },
    { id: "gato", name: "Baño felino", kind: "bath", species: "cat", description: null },
  ],
  extras: [
    { id: "hidra", service_id: "bano", name: "Hidratación", extra_minutes: 15 },
    { id: "tinte", service_id: "corte", name: "Tinte", extra_minutes: 0 },
  ],
  options: [{ id: "mono", service_id: "bano", name: "Moño", stage: "details" }],
  locations: [
    { id: NORTE, name: "Norte", address: null, max_days_ahead: 30 },
    { id: SUR, name: "Sur", address: null, max_days_ahead: 30 },
  ],
  servicePrices: [
    { location_id: NORTE, service_id: "bano", size: "M", coat: "short", price_cop: 40000 },
    { location_id: SUR, service_id: "bano", size: "M", coat: "short", price_cop: 35000 },
    { location_id: NORTE, service_id: "corte", size: "M", coat: "short", price_cop: 30000 },
    { location_id: NORTE, service_id: "unas", size: "M", coat: "short", price_cop: 10000 },
    { location_id: NORTE, service_id: "gato", size: "S", coat: "long", price_cop: 50000 },
  ],
  extraPrices: [
    { location_id: NORTE, extra_id: "hidra", size: "M", coat: "short", price_cop: 10000 },
    { location_id: SUR, extra_id: "hidra", size: "M", coat: "short", price_cop: 12000 },
  ],
};

const max: BookingPet = { id: "max", name: "Max", species: "dog", size: "M", coat: "short" };
const misu: BookingPet = { id: "misu", name: "Misu", species: "cat", size: "S", coat: "long" };

describe("servicesFor", () => {
  it("solo servicios de su especie que algún local ofrece, con el precio más bajo", () => {
    expect(servicesFor(catalog, max, ["bath", "other"]).map((s) => [s.id, s.fromPrice])).toEqual([
      ["bano", 35000],
      ["unas", 10000],
    ]);
    expect(servicesFor(catalog, misu, ["bath", "other"]).map((s) => s.id)).toEqual(["gato"]);
    expect(servicesFor(catalog, max, ["special_cut"]).map((s) => s.id)).toEqual(["corte"]);
  });
});

describe("selección", () => {
  it("los adicionales y opcionales dependen de los servicios elegidos", () => {
    const bath = chooseService(catalog, emptySelection("max"), "bano");
    expect(extrasFor(catalog, max, bath).map((e) => [e.id, e.fromPrice])).toEqual([
      ["hidra", 10000],
    ]);
    expect(optionsFor(catalog, bath).map((o) => o.id)).toEqual(["mono"]);
    // El tinte no tiene precio para esta talla en ningún local.
    expect(extrasFor(catalog, max, { ...bath, cutId: "corte" }).map((e) => e.id)).toEqual([
      "hidra",
    ]);
  });

  it("cambiar a un servicio sin baño quita corte, opcionales y adicionales ajenos", () => {
    const bath = { ...chooseService(catalog, emptySelection("max"), "bano"), cutId: "corte" };
    const full = { ...bath, extras: ["hidra"], options: ["mono"] };
    expect(chooseService(catalog, full, "unas")).toEqual({
      petId: "max",
      serviceId: "unas",
      cutId: null,
      extras: [],
      options: [],
    });
  });
});

describe("quote", () => {
  const selection = {
    ...emptySelection("max"),
    serviceId: "bano",
    cutId: "corte",
    extras: ["hidra"],
  };

  it("suma los precios del local elegido", () => {
    expect(quote(catalog, NORTE, [max], [selection])).toEqual({
      lines: [
        { petId: "max", name: "Baño", price: 40000 },
        { petId: "max", name: "Corte de raza", price: 30000 },
        { petId: "max", name: "Hidratación", price: 10000 },
      ],
      missing: [],
      total: 80000,
    });
  });

  it("indica lo que el local no ofrece", () => {
    expect(quote(catalog, SUR, [max], [selection]).missing).toEqual(["Corte de raza (Max)"]);
  });
});

describe("toBookingPets", () => {
  it("arma el formato de la reserva", () => {
    expect(
      toBookingPets([
        { petId: "max", serviceId: "bano", cutId: "corte", extras: ["hidra"], options: ["mono"] },
      ]),
    ).toEqual([
      { pet_id: "max", services: ["bano", "corte"], extras: ["hidra"], options: ["mono"] },
    ]);
  });
});
