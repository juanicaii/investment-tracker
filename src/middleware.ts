import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  console.log("[Middleware]", { pathname, isLoggedIn, auth: req.auth });

  // Allow auth API routes
  if (pathname.startsWith("/api/auth")) {
    return;
  }

  // Allow login page for non-logged-in users
  if (pathname === "/login") {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", req.url));
    }
    return;
  }

  // Protect all other routes
  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|sw\\.js|.*\\.png|.*\\.svg).*)"],
};
