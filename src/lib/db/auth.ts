import type { User } from "@supabase/supabase-js";

import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentUserMembership() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, membership: null };
  }

  const supabase = await createSupabaseAuthServerClient();
  const result = await supabase
    .from("organization_members")
    .select("id, organization_id, role, organizations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Failed to load organization membership: ${result.error.message}`);
  }

  return {
    user,
    membership: result.data,
  };
}
