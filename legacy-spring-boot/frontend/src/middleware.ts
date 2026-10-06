import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const COOKIE = "cb_session";
type Session = { role: string; pc: boolean } | null;

async function readSession(req: NextRequest): Promise<Session> {
  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return { role: String(payload.role), pc: payload.pc === true };
  } catch {
    return null; // bad signature / expired / tampered → treated as signed out (AT-12)
  }
}

const STAFF = ["OFFICER", "ADMIN", "SUPER_ADMIN"];

function redirect(req: NextRequest, path: string, withNext = false) {
  const url = req.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  if (withNext) url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

/**
 * FR-A11. This is routing UX only – the API re-checks every request against the database.
 *  /dashboard, /report, /complaints → CITIZEN with a complete profile
 *  /complete-profile                → CITIZEN
 *  /admin/**                        → SUPER_ADMIN / ADMIN / OFFICER (except /admin/login)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await readSession(req);

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return s && STAFF.includes(s.role) ? redirect(req, "/admin/dashboard") : NextResponse.next();
    }
    if (!s || !STAFF.includes(s.role)) return redirect(req, "/admin/login", true);
    if (pathname.startsWith("/admin/settings") && s.role !== "SUPER_ADMIN") return redirect(req, "/admin/dashboard");
    return NextResponse.next();
  }

  if (pathname === "/complete-profile") {
    if (!s) return redirect(req, "/login", true);
    if (s.role !== "CITIZEN") return redirect(req, "/admin/dashboard");
    return NextResponse.next();
  }

  // citizen area
  if (!s) return redirect(req, "/login", true);
  if (s.role !== "CITIZEN") return redirect(req, "/admin/dashboard");
  if (!s.pc) return redirect(req, "/complete-profile");
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/report/:path*", "/complaints/:path*", "/complete-profile", "/admin/:path*"],
};
