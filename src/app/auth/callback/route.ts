import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const avatarUrl = getAvatarUrl(user?.user_metadata);

    if (!error && user && avatarUrl) {
      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
    }
    if (!error) return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", url.origin));
  }
  return NextResponse.redirect(new URL("/auth/error", url.origin));
}

function getAvatarUrl(metadata?: Record<string, unknown>) {
  const value =
    metadata?.avatar_url ?? metadata?.picture ?? metadata?.profile_image_url;
  return typeof value === "string" ? value : null;
}
