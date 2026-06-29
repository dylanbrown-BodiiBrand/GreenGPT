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

  if (supabase) {
    await supabase.auth.getUser();
  }

  if (!pathname.startsWith("/admin")) {
    return res;
  }

  if (!supabase) {
    if (isPublicAdminPath(pathname)) return res;
    return NextResponse.redirect(new URL("/", req.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicAdminPath(pathname)) {
    if (user?.email && isAdminEmail(user.email) && pathname.startsWith("/admin/login")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return res;
  }

  if (!user?.email) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
