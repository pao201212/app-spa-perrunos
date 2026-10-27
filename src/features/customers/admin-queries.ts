import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { sanitizeSearch } from "./admin-schema";
import { PET_COLUMNS, withPhotoUrls } from "./queries";

const PAGE_SIZE = 50;

/** Clientes del spa, filtrados por nombre, WhatsApp o correo. */
export async function searchCustomers(tenantId: string, query: string | undefined) {
  const supabase = await createSupabaseServerClient();
  const term = sanitizeSearch(query);
  let request = supabase
    .from("customers")
    .select("id, full_name, whatsapp, email, user_id, pets (count)")
    .eq("tenant_id", tenantId)
    .order("full_name")
    .limit(PAGE_SIZE);
  if (term) {
    request = request.or(
      `full_name.ilike.%${term}%,whatsapp.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }
  const { data, error } = await request;
  if (error) throw error;
  return data.map(({ pets, ...customer }) => ({ ...customer, petCount: pets[0]?.count ?? 0 }));
}

export async function getCustomerForStaff(tenantId: string, customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, whatsapp, email, user_id")
    .match({ tenant_id: tenantId, id: customerId })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCustomerPets(customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pets")
    .select(PET_COLUMNS)
    .match({ customer_id: customerId, is_active: true })
    .order("created_at");
  if (error) throw error;
  return withPhotoUrls(data);
}

export async function getCustomerPet(customerId: string, petId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pets")
    .select(PET_COLUMNS)
    .match({ customer_id: customerId, id: petId, is_active: true })
    .maybeSingle();
  if (error) throw error;
  return data ? (await withPhotoUrls([data]))[0] : null;
}

export type StaffCustomer = NonNullable<Awaited<ReturnType<typeof getCustomerForStaff>>>;

/** Grupos "se bañan juntas" del cliente con los nombres de sus mascotas. */
export async function listCustomerPetGroups(customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pet_groups")
    .select("id, pet_group_members (pet_id, pets (name))")
    .eq("customer_id", customerId)
    .order("created_at");
  if (error) throw error;
  return data.map((group) => ({
    id: group.id,
    petIds: group.pet_group_members.map((m) => m.pet_id),
    names: group.pet_group_members.map((m) => m.pets.name).sort((a, b) => a.localeCompare(b, "es")),
  }));
}

export type PetGroup = Awaited<ReturnType<typeof listCustomerPetGroups>>[number];
