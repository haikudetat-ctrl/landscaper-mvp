import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey ?? anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
