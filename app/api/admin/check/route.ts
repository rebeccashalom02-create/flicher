import { NextRequest, NextResponse } from "next/server";
import { getVerifiedUser, isAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getVerifiedUser(request);
  if (!user) return NextResponse.json({ admin: false }, { status: 401 });
  const admin = await isAdmin(user.id);
  return NextResponse.json({ admin });
}
