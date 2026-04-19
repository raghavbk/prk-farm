import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// Is the calling user a platform admin? cache()'d per request so the sidebar,
// layout, and page can all call this without fanning out to Supabase.
export const isCurrentUserPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return data === true;
});
