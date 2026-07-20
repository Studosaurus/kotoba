import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
