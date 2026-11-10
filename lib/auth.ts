
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function getVerifiedUser(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");

    if (!auth?.startsWith("Bearer ")) return null;

    const token = auth.slice("Bearer ".length).trim();
    if (!token) return null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      console.error("Missing Supabase URL or anon key.");
      return null;
    }

    const client = createClient(url, anon, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      console.error("USER VERIFICATION ERROR:", error?.message);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("USER VERIFICATION FAILED:", error);
    return null;
  }
}

export async function isAdmin(userId: string) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("ADMIN DATABASE ERROR:", error.message);
      return false;
    }

    console.log("ADMIN PROFILE RESULT:", data);

    return data?.role === "admin";
  } catch (error) {
    console.error("ADMIN CHECK FAILED:", error);
    return false;
  }
}
