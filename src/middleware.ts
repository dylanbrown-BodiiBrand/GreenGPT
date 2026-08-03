import { type NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/auth/callback"];

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next({ request: req });
  const supabase = createSupabaseMiddlewareClient(req, res);

  let userEmail: string | null = null;
  let userId: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    userId = user?.id ?? null;
  }

  if (pathname.startsWith("/workspace")) {
    if (!userId) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  if (!pathname.startsWith("/admin")) {
    return res;
  }

  if (!supabase) {
    if (isPublicAdminPath(pathname)) return res;
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublicAdminPath(pathname)) {
    if (userEmail && isAdminEmail(userEmail) && pathname.startsWith("/admin/login")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return res;
  }

  if (!userEmail) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isAdminEmail(userEmail)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/workspace",
    "/workspace/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
