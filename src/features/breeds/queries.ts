import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const BREED_COLUMNS = "id, species, name, default_size, default_coat, is_mixed";

export async function listGlobalBreeds() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("global_breeds").select(BREED_COLUMNS).order("name");
  if (error) throw error;
  return data;
}

export async function getGlobalBreed(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("global_breeds")
    .select(BREED_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type GlobalBreed = Awaited<ReturnType<typeof listGlobalBreeds>>[number];
