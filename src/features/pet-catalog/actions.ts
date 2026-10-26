"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { tenantStaffContext } from "@/lib/auth/tenant-context";
import { PET_SIZES, speciesLabel, type Species } from "@/lib/pets/labels";

import { makeThresholdsSchema, ownBreedSchema, tenantBreedEditSchema } from "./schema";

const LIST_PATH = "/admin/razas";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const pluralSpecies = (species: Species) => `${speciesLabel[species].toLowerCase()}s`;

export async function saveThresholdsAction(
  slug: string,
  species: Species,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, LIST_PATH);
  const { data: current, error: readError } = await supabase
    .from("size_thresholds")
    .select("size")
    .match({ tenant_id: tenant.id, species });
  if (readError) return { status: "error", message: "No pudimos leer las tallas actuales." };

  const sizes = PET_SIZES.filter((size) => current.some((row) => row.size === size));
  const values = formValues(formData, sizes);
  const parsed = makeThresholdsSchema(sizes).safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const rows = sizes.map((size) => ({
    tenant_id: tenant.id,
    species,
    size,
    max_kg: parsed.data[size],
  }));
  const { error } = await supabase.from("size_thresholds").upsert(rows);
  if (error?.code === CHECK_VIOLATION) return { status: "error", message: error.message, values };
  if (error) return { status: "error", message: "No pudimos guardar las tallas.", values };
  refresh();
  return { status: "success", message: `Tallas de ${pluralSpecies(species)} guardadas` };
}

export async function createOwnBreedAction(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, `${LIST_PATH}/nueva`);
  const values = formValues(formData, ["species", "name", "size", "coat"]);
  const parsed = ownBreedSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("tenant_breeds")
    .insert({ ...parsed.data, tenant_id: tenant.id });
  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: { name: "Ya existe una raza con ese nombre para esa especie" },
      values,
    };
  }
  if (error) return { status: "error", message: "No pudimos crear la raza.", values };
  redirect(LIST_PATH);
}

export async function updateTenantBreedAction(
  slug: string,
  breedId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, `${LIST_PATH}/${breedId}`);
  const values = formValues(formData, ["size", "coat", "is_active"]);
  const parsed = tenantBreedEditSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("tenant_breeds")
    .update(parsed.data)
    .match({ id: breedId, tenant_id: tenant.id });
  if (error) return { status: "error", message: "No pudimos guardar la raza.", values };
  redirect(LIST_PATH);
}

export async function resetTenantBreedAction(slug: string, breedId: string): Promise<void> {
  const { supabase } = await tenantStaffContext(slug, `${LIST_PATH}/${breedId}`);
  const { error } = await supabase.rpc("reset_tenant_breed", { p_breed_id: breedId });
  if (error) throw new Error("No pudimos restaurar la raza");
  redirect(LIST_PATH);
}

export async function deleteOwnBreedAction(slug: string, breedId: string): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, `${LIST_PATH}/${breedId}`);
  // Solo razas propias: las heredadas del catálogo se ocultan, no se borran.
  const { error } = await supabase
    .from("tenant_breeds")
    .delete()
    .match({ id: breedId, tenant_id: tenant.id })
    .is("global_breed_id", null);
  if (error) throw new Error("No pudimos eliminar la raza");
  redirect(LIST_PATH);
}
