import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import type { Database } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Viewer } from "./roles";

/** Roles del usuario leídos con su propia sesión: RLS solo le deja ver lo suyo. */
export async function loadViewer(supabase: SupabaseClient<Database>, user: User): Promise<Viewer> {
  const [superAdmin, memberships] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select("tenants!inner(slug, name, is_active)")
      .eq("user_id", user.id),
  ]);
  if (superAdmin.error) throw superAdmin.error;
  if (memberships.error) throw memberships.error;

  const tenants = memberships.data
    .map((m) => m.tenants)
    .filter((t) => t.is_active)
    .map(({ slug, name }) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const metadata = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return {
    userId: user.id,
    email: user.email,
    name: metadata?.full_name ?? metadata?.name,
    isSuperAdmin: superAdmin.data !== null,
    tenants,
  };
}

/** Usuario de la petición actual con sus roles, o null si no hay sesión. Memoizado por petición. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? loadViewer(supabase, data.user) : null;
});
