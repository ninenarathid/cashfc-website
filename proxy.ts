import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the token so the session does not silently expire
  await supabase.auth.getUser();
  return response;
}

/**
 * Everything except the files.
 *
 * A request that reaches this waits on a round trip to Supabase before
 * anything is served, which is the right price for a page and an absurd one
 * for a picture. webp and avif were missing from the list, so every one of the
 * three hundred-odd webp files on this site — the emotes, and Aqua — paid for
 * a token refresh before it could be drawn. It showed: her card arrived before
 * she did.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|json)$).*)",
  ],
};
