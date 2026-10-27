import { describe, expect, it } from "vitest";

import { getBookingCatalog } from "@/features/booking/queries";
import { getGlobalBreed, listGlobalBreeds } from "@/features/breeds/queries";
import { getPublicCatalog, getPublicLocations } from "@/features/catalog/queries";
import {
  getCustomerForStaff,
  getCustomerPet,
  listCustomerPetGroups,
  listCustomerPets,
  searchCustomers,
} from "@/features/customers/admin-queries";
import {
  getOwnPet,
  listBreedOptions,
  listOwnPets,
  withPhotoUrls,
} from "@/features/customers/queries";
import { countLocations, getLocationDetail, listLocations } from "@/features/locations/queries";
import {
  getSizeThresholds,
  getTenantBreed,
  listTenantBreeds,
} from "@/features/pet-catalog/queries";
import {
  getLocationPrices,
  getService,
  getServiceDurations,
  listCategories,
  listServices,
} from "@/features/services/queries";
import { getStaffDetail, listStaff } from "@/features/staff/queries";
import { getTenantBySlugForConsole, getTenantStaff, listTenants } from "@/features/tenants/queries";
import { getOwnCustomer } from "@/lib/auth/customer";

import { dataset, IDS } from "../fixtures/dataset";
import { withSupabase } from "../server-env";

// Toda consulta propaga el error de Supabase (la página muestra el error en vez de datos vacíos).

const boom = { message: "boom" };
const failingTables = new Proxy({}, { get: () => ({ data: null, error: boom }) }) as Record<
  string,
  never
>;
const T = "t1";

const queries: [string, () => Promise<unknown>][] = [
  ["getBookingCatalog", () => getBookingCatalog(T)],
  ["listGlobalBreeds", () => listGlobalBreeds()],
  ["getGlobalBreed", () => getGlobalBreed("b")],
  ["getPublicLocations", () => getPublicLocations(T)],
  ["getPublicCatalog", () => getPublicCatalog(T, IDS.location)],
  ["searchCustomers", () => searchCustomers(T, "ana")],
  ["getCustomerForStaff", () => getCustomerForStaff(T, "c")],
  ["listCustomerPets", () => listCustomerPets("c")],
  ["getCustomerPet", () => getCustomerPet("c", "p")],
  ["listCustomerPetGroups", () => listCustomerPetGroups("c")],
  ["listOwnPets", () => listOwnPets("c")],
  ["getOwnPet", () => getOwnPet("c", "p")],
  ["listBreedOptions", () => listBreedOptions(T)],
  ["listLocations", () => listLocations(T)],
  ["countLocations", () => countLocations(T)],
  ["getLocationDetail", () => getLocationDetail(T, "l")],
  ["listTenantBreeds", () => listTenantBreeds(T)],
  ["getTenantBreed", () => getTenantBreed(T, "b")],
  ["getSizeThresholds", () => getSizeThresholds(T)],
  ["listCategories", () => listCategories(T)],
  ["listServices", () => listServices(T)],
  ["getService", () => getService(T, "s")],
  ["getServiceDurations", () => getServiceDurations("s")],
  ["getLocationPrices", () => getLocationPrices("l", "s")],
  ["listStaff", () => listStaff(T)],
  ["getStaffDetail", () => getStaffDetail(T, "s")],
  ["listTenants", () => listTenants()],
  ["getTenantBySlugForConsole", () => getTenantBySlugForConsole("spa")],
  ["getTenantStaff", () => getTenantStaff(T)],
  ["getOwnCustomer", () => getOwnCustomer(T, "u")],
];

describe("las consultas propagan los errores", () => {
  it.each(queries)("%s", async (_, run) => {
    withSupabase({ tables: failingTables, rpcError: boom });
    await expect(run()).rejects.toMatchObject({ message: "boom" });
  });
});

describe("casos borde de las consultas", () => {
  it("withPhotoUrls: sin fotos no pide URLs; con fotos usa las firmadas", async () => {
    const fake = withSupabase();
    expect(await withPhotoUrls([{ photo_path: null }])).toEqual([
      { photo_path: null, photoUrl: null },
    ]);
    expect(fake.storageBucket.createSignedUrls).not.toHaveBeenCalled();
    expect(await withPhotoUrls([{ photo_path: "a.webp" }, { photo_path: null }])).toEqual([
      { photo_path: "a.webp", photoUrl: "https://signed/a.webp" },
      { photo_path: null, photoUrl: null },
    ]);
    fake.storageBucket.createSignedUrls.mockResolvedValueOnce({ data: null, error: boom } as never);
    expect(await withPhotoUrls([{ photo_path: "b.webp" }])).toEqual([
      { photo_path: "b.webp", photoUrl: null },
    ]);
  });

  it("buscar clientes sin término lista todos; listas sin datos quedan vacías", async () => {
    const fake = withSupabase({ dataset: { ...dataset(), customers: [{ id: "c", pets: [] }] } });
    expect(await searchCustomers(T, "  ")).toEqual([{ id: "c", petCount: 0 }]);
    expect(fake.calls.some((c) => c.method === "or")).toBe(false);
    withSupabase({ dataset: { services: [{ id: "s", extras: [] }] } });
    expect(await listServices(T)).toEqual([{ id: "s", extraCount: 0 }]);
    expect(await countLocations(T)).toBe(0);
    withSupabase({ tables: { locations: { data: null, error: null, count: null } } });
    expect(await countLocations(T)).toBe(0);
  });

  it("el catálogo público omite servicios sin precio y extras inactivos o sin precio", async () => {
    withSupabase({
      dataset: {
        ...dataset(),
        services: [
          {
            id: IDS.bath,
            name: "Baño",
            kind: "bath",
            species: "both",
            description: null,
            sort_order: 0,
            service_categories: null,
            extras: [
              { id: IDS.extra, name: "Hidratación", is_active: true },
              { id: "x2", name: "Inactivo", is_active: false },
              { id: "x3", name: "Sin precio", is_active: true },
            ],
          },
          { id: "sin-precio", name: "Otro", kind: "other", species: "dog", extras: [] },
        ],
        location_service_prices: [
          { service_id: IDS.bath, price_cop: 45000 },
          { service_id: IDS.bath, price_cop: 40000 },
        ],
        location_extra_prices: [{ extra_id: IDS.extra, price_cop: 10000 }],
      },
    });
    expect(await getPublicCatalog(T, IDS.location)).toEqual([
      expect.objectContaining({
        id: IDS.bath,
        category: "Otros servicios",
        categoryOrder: 999,
        fromPrice: 40000,
        extras: [{ id: IDS.extra, name: "Hidratación", fromPrice: 10000 }],
      }),
    ]);
    withSupabase({
      tables: {
        services: { data: null, error: null },
        location_service_prices: { data: null, error: null },
        location_extra_prices: { data: null, error: null },
      },
    });
    expect(await getPublicCatalog(T, IDS.location)).toEqual([]);
  });
});
