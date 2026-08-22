import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js App Proxy / Middleware ETHONE.
 * Rafraîchit la session Supabase côté serveur et garantit que les cookies
 * de session portent les flags de sécurité (httpOnly, Secure, SameSite=Lax).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const secureOptions = {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax" as const,
              path: "/",
            };
            request.cookies.set(name, value);
            response.cookies.set(name, value, secureOptions);
          });
        },
      },
    }
  );

  // Rafraîchit la session si un refresh token est présent
  await supabase.auth.getUser();

  const publicRoutes = ["/login", "/password-recovery", "/reset-password"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicRoute && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico).*)",
  ],
};
