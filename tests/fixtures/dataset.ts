import { STAFF, TENANT } from "../server-env";

// Datos de un spa de ejemplo con la forma de las consultas (incluye las relaciones embebidas).
// Sirve para renderizar páginas en pruebas unitarias con el Supabase simulado.

export const IDS = {
  location: "10000000-0000-4000-8000-000000000001",
  bath: "20000000-0000-4000-8000-000000000001",
  cut: "20000000-0000-4000-8000-000000000002",
  category: "30000000-0000-4000-8000-000000000001",
  extra: "40000000-0000-4000-8000-000000000001",
  option: "50000000-0000-4000-8000-000000000001",
  staff: "60000000-0000-4000-8000-000000000001",
  breed: "70000000-0000-4000-8000-000000000001",
  mixedBreed: "70000000-0000-4000-8000-000000000002",
  globalBreed: "80000000-0000-4000-8000-000000000001",
  customer: "90000000-0000-4000-8000-000000000001",
  pet: "a0000000-0000-4000-8000-000000000001",
  pet2: "a0000000-0000-4000-8000-000000000002",
  group: "b0000000-0000-4000-8000-000000000001",
  appointment: "c0000000-0000-4000-8000-000000000001",
};

const location = {
  id: IDS.location,
  tenant_id: TENANT.id,
  name: "Sede principal",
  address: "Calle 1 # 2-3",
  whatsapp: "+57 300 000 0000",
  is_active: true,
  confirmation_mode: "auto",
  cancel_window_hours: 4,
  max_days_ahead: 30,
  slot_step_min: 15,
  bather_continues_drying: true,
  capacity_mode: "simple",
  stations: [
    { id: "s1", name: "Tina 1", kind: "tub", for_special_cut: false, sort_order: 1 },
    { id: "s2", name: "Mesa 1", kind: "table", for_special_cut: true, sort_order: 1 },
  ],
  location_hours: [
    { id: "h1", weekday: 1, opens_at: "08:00:00", closes_at: "12:00:00" },
    { id: "h2", weekday: 1, opens_at: "13:00:00", closes_at: "17:00:00" },
  ],
  location_closures: [{ id: "cl1", date: "2026-12-25", reason: "Navidad" }],
  location_pet_capacity: [{ species: "dog", size: "M", coat: "short", pets_per_staff: 6 }],
  location_waiting_zones: [{ id: "z1", name: "Sala de espera", seats: 4 }],
};

const extra = {
  id: IDS.extra,
  service_id: IDS.bath,
  name: "Hidratación",
  extra_minutes: 15,
  is_active: true,
  count: 1,
};

const pet = {
  id: IDS.pet,
  customer_id: IDS.customer,
  name: "Rocky",
  species: "dog",
  gender: "male",
  breed_id: IDS.breed,
  weight_kg: 8,
  size: "M",
  coat: "short",
  size_locked: false,
  photo_path: `${TENANT.id}/rocky.webp`,
  notes: null,
  is_active: true,
  tenant_breeds: { name: "Pug", is_mixed: false },
};

export function dataset(): Record<string, Record<string, unknown>[]> {
  return {
    tenants: [{ ...TENANT, is_active: true }],
    locations: [location],
    service_categories: [{ id: IDS.category, name: "Baños", sort_order: 1 }],
    services: [
      {
        id: IDS.bath,
        name: "Baño",
        kind: "bath",
        species: "both",
        description: "Con shampoo neutro",
        is_active: true,
        sort_order: 0,
        category_id: IDS.category,
        service_categories: { name: "Baños", sort_order: 1 },
        extras: [extra],
        service_options: [{ id: IDS.option, name: "Moño", stage: "details", sort_order: 0 }],
      },
      {
        id: IDS.cut,
        name: "Corte de raza",
        kind: "special_cut",
        species: "dog",
        description: null,
        is_active: true,
        sort_order: 1,
        category_id: null,
        service_categories: null,
        extras: [],
        service_options: [],
      },
    ],
    extras: [extra],
    service_options: [
      { id: IDS.option, service_id: IDS.bath, name: "Moño", stage: "details", sort_order: 0 },
    ],
    service_durations: [
      {
        service_id: IDS.bath,
        size: "M",
        coat: "short",
        bath_min: 40,
        dry_min: 30,
        details_min: 20,
        cut_min: null,
      },
    ],
    location_service_prices: [
      {
        location_id: IDS.location,
        service_id: IDS.bath,
        size: "M",
        coat: "short",
        price_cop: 45000,
      },
      {
        location_id: IDS.location,
        service_id: IDS.cut,
        size: "M",
        coat: "short",
        price_cop: 30000,
      },
    ],
    location_extra_prices: [
      {
        location_id: IDS.location,
        extra_id: IDS.extra,
        size: "M",
        coat: "short",
        price_cop: 10000,
        extras: { service_id: IDS.bath },
      },
    ],
    staff: [
      {
        id: IDS.staff,
        name: "Ana",
        is_active: true,
        staff_skills: [{ skill: "bath" }, { skill: "dry" }],
        staff_shifts: [
          {
            id: "sh1",
            weekday: 1,
            starts_at: "08:00:00",
            ends_at: "17:00:00",
            location_id: IDS.location,
            locations: { name: "Sede principal" },
          },
        ],
        staff_absences: [
          {
            id: "ab1",
            starts_at: "2026-12-24T13:00:00+00:00",
            ends_at: "2026-12-24T22:00:00+00:00",
            reason: "Vacaciones",
          },
        ],
      },
    ],
    tenant_breeds: [
      {
        id: IDS.breed,
        global_breed_id: IDS.globalBreed,
        species: "dog",
        name: "Pug",
        size: "S",
        coat: "short",
        is_mixed: false,
        is_customized: true,
        is_active: true,
      },
      {
        id: IDS.mixedBreed,
        global_breed_id: null,
        species: "dog",
        name: "Criollo",
        size: "M",
        coat: "short",
        is_mixed: true,
        is_customized: false,
        is_active: true,
      },
    ],
    size_thresholds: [
      { species: "dog", size: "XS", max_kg: 3 },
      { species: "dog", size: "S", max_kg: 10 },
      { species: "dog", size: "M", max_kg: 20 },
      { species: "dog", size: "L", max_kg: 35 },
      { species: "dog", size: "XL", max_kg: 50 },
      { species: "cat", size: "S", max_kg: 4 },
      { species: "cat", size: "M", max_kg: 6 },
    ],
    global_breeds: [
      {
        id: IDS.globalBreed,
        species: "dog",
        name: "Pug",
        default_size: "S",
        default_coat: "short",
        is_mixed: false,
      },
    ],
    customers: [
      {
        id: IDS.customer,
        tenant_id: TENANT.id,
        full_name: "Lucía Gómez",
        whatsapp: "+57 300 123 4567",
        email: "lucia@spa.test",
        user_id: STAFF.userId,
        pets: [{ count: 2 }],
      },
    ],
    pets: [pet, { ...pet, id: IDS.pet2, name: "Lola", photo_path: null, size_locked: true }],
    pet_groups: [
      {
        id: IDS.group,
        pet_group_members: [
          { pet_id: IDS.pet, pets: { name: "Rocky" } },
          { pet_id: IDS.pet2, pets: { name: "Lola" } },
        ],
      },
    ],
    appointments: [
      {
        id: IDS.appointment,
        code: "ABC234",
        status: "received",
        starts_at: "2026-11-02T13:00:00+00:00",
        estimated_ready_at: "2026-11-02T14:30:00+00:00",
        total_cop: 45000,
        overbooked: true,
        notes: "Tímido",
        source: "web",
        client_confirmed_at: null,
        locations: { name: "Sede principal", whatsapp: "+57 300 000 0000" },
        customers: { id: IDS.customer, full_name: "Lucía Gómez", whatsapp: "+57 300 123 4567" },
        appointment_pets: [
          {
            pet_id: IDS.pet,
            size: "M",
            coat: "short",
            pets: { name: "Rocky" },
            appointment_items: [
              { item_type: "service", name: "Baño" },
              { item_type: "option", name: "Moño" },
            ],
          },
        ],
      },
    ],
    platform_admins: [],
    memberships: [],
  };
}
