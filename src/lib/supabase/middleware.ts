import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Forward a mutable copy of request headers so Server Components can read
  // x-pathname + x-tenant-id via `headers()`. Setting them on the response
  // only sends them back to the browser — RSCs can't see response headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Host-based tenant resolution. The domain IS the tenant context on customer
  // hosts; on platform/dev hosts this returns null and we fall back to the
  // active_tenant_id cookie for the platform-admin console.
  const host = normalizeHost(request.headers.get("host"));
  if (host) requestHeaders.set("x-host", host);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is what keeps the user logged in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve host → tenant BEFORE the auth gate so onboarding / callback routes
  // on customer hosts land under the right tenant context.
  if (host) {
    const { data: tenantId } = await supabase.rpc("resolve_tenant_by_domain", {
      p_domain: host,
    });
    if (tenantId) requestHeaders.set("x-tenant-id", tenantId as string);
  }

  const publicPaths = ["/login", "/setup", "/auth/callback", "/auth/set-password", "/auth/signout", "/preview"];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Lowercase the host. Keep the port for localhost so `localhost:3000` can
// resolve without colliding with real prod domains; strip the port for
// everything else (Vercel / customer CNAMEs).
function normalizeHost(host: string | null): string | null {
  if (!host) return null;
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")) {
    return trimmed;
  }
  return trimmed.split(":")[0];
}
