import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseBrowser() {
  if (!url || !anon) throw new Error("Missing Supabase environment variables. Copy .env.example to .env.local.");
  return createClient(url, anon);
}

export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing server Supabase environment variables.");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
