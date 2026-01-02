import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isLoggedIn = !!token;

  const { pathname } = req.nextUrl;

  const isOnDashboard = pathname.startsWith("/dashboard");
  const isOnTransactions = pathname.startsWith("/transactions");
  const isOnAssets = pathname.startsWith("/assets");
  const isOnLogin = pathname.startsWith("/login");
  const isOnApi = pathname.startsWith("/api");
  const isOnAuth = pathname.startsWith("/api/auth");

  // Protect dashboard, transactions, and assets routes
  if ((isOnDashboard || isOnTransactions || isOnAssets) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect logged-in users away from login page
  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect API routes (except auth)
  if (isOnApi && !isOnAuth && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/assets/:path*",
    "/login",
    "/api/((?!auth).*)",
  ],
};
