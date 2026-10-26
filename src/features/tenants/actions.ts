"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { assignAdminSchema, tenantFormSchema } from "./schema";

const UNIQUE_VIOLATION = "23505";
const TENANT_FIELDS = ["name", "slug", "timezone", "currency"] as const;

export async function createTenantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin("/spas/nuevo");
  const values = formValues(formData, TENANT_FIELDS);
  const parsed = tenantFormSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tenants").insert(parsed.data);
  if (error?.code === UNIQUE_VIOLATION) {
    return { status: "error", fieldErrors: { slug: "Ese subdominio ya está en uso" }, values };
  }
  if (error)
    return { status: "error", message: "No pudimos crear el spa. Intenta de nuevo.", values };

  redirect(`/spas/${parsed.data.slug}`);
}

export async function assignAdminAction(
  tenantId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin("/");
  const values = formValues(formData, ["email"]);
  const parsed = assignAdminSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("assign_tenant_admin", {
    p_tenant_id: tenantId,
    p_email: parsed.data.email,
  });
  if (error) return { status: "error", message: "No pudimos agregar al administrador.", values };

  // Vuelve a renderizar la página para mostrar al nuevo admin en la lista.
  refresh();
  return {
    status: "success",
    message:
      data === "member"
        ? `${parsed.data.email} ya puede administrar este spa.`
        : `Invitación enviada: ${parsed.data.email} tendrá acceso cuando ingrese con Google.`,
  };
}
