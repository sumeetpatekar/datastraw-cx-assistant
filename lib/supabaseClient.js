import { createClient } from "@supabase/supabase-js";

// Server-side client, used only inside API routes (never exposed to the
// browser). Uses the service role key so it can write logs regardless of
// row-level security policies -- this is safe because it only ever runs
// on the server, never in client-side code.
let supabase = null;

export function getSupabaseServerClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Logging is a nice-to-have for the demo, not a blocker. If env vars
    // aren't set (e.g. first local run before Supabase is configured),
    // we skip logging instead of crashing the request.
    return null;
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  return supabase;
}
