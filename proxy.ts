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
 * Only where the server reads the session.
 *
 * Two pages render with the reader's session on the server, an event and a
 * gallery post, and two routes act on it: the character claim and the sign-in
 * callback. Every other page is the same for everybody, and the browser client
 * keeps its own session fresh.
 *
 * This used to run in front of every page, and on Vercel that is an invocation
 * and a round trip to Supabase Auth for each page view and each prefetch —
 * the cached pages included, which would otherwise cost nothing to serve.
 *
 * A page that starts reading the session on the server has to be added here.
 * With nothing refreshing in front of it, a server component that finds an
 * expired token refreshes it itself and cannot write the result back, which
 * leaves the browser holding a spent refresh token — and Supabase answers that
 * by signing the member out.
 */
export const config = {
  matcher: [
    "/events/:id",
    "/gallery/:id",
    "/api/verify-character",
    "/auth/:path*",
  ],
};
