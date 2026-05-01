"use server";

import { redirect } from "next/navigation";

import { createSupabaseAuthServerClient } from "@/lib/supabase/server";

export type OnboardingFormState = {
  error: string | null;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createOrganizationAction(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const businessName = readString(formData, "businessName");
  const ownerDisplayName = readString(formData, "ownerDisplayName");

  if (!businessName) {
    return { error: "Business name is required." };
  }

  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const displayName =
    ownerDisplayName ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Owner";

  const onboardingResult = await supabase.rpc("onboard_organization", {
    p_business_name: businessName,
    p_display_name: displayName,
  });

  if (onboardingResult.error) {
    return { error: onboardingResult.error.message };
  }

  redirect("/");
}
