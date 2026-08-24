import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const denied = searchParams.get("error_description") ?? searchParams.get("error");
  const supabase = await createClient();

  if (denied) {
    // Cancelled at Discord's consent screen, or the provider refused outright.
    return NextResponse.redirect(`${origin}/?auth=denied`);
  }

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Signing in again from a tab that still holds a session lands here: the PKCE
      // verifier for this code is already spent, so the exchange fails even though
      // nothing is actually wrong. Trust the session over the exchange, and only
      // treat this as a real failure when there is no usable session either way.
      const { data } = await supabase.auth.getUser();
      if (!data.user) return NextResponse.redirect(`${origin}/?auth=retry`);
    }
  }

  return NextResponse.redirect(`${origin}/profile`);
}
