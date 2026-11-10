import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in is required to stream or download." }, { status: 401 });

  const { id } = await context.params;
  const db = supabaseAdmin();
  const { data: title, error } = await db.from("movies")
    .select("id, video_path, published, downloadable")
    .eq("id", id).maybeSingle();

  if (error || !title || !title.published || !title.video_path) {
    return NextResponse.json({ error: "Video not found or not available." }, { status: 404 });
  }

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  if (wantsDownload && !title.downloadable) {
    return NextResponse.json({ error: "Downloads are not enabled for this title." }, { status: 403 });
  }

  const { data, error: signError } = await db.storage.from("videos").createSignedUrl(
    title.video_path, 60 * 60, wantsDownload ? { download: true } : undefined
  );
  if (signError || !data?.signedUrl) {
    return NextResponse.json({ error: "Could not create a video link." }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl });
}
