import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// cache() deduplicates repeated calls within a single request render —
// layout, nav, and page can all call this without triggering N auth
// requests to Supabase.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
