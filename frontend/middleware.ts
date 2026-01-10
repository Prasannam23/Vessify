import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register"];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

    // Redirect authenticated users away from auth pages
    if (req.nextauth.token && isAuthPage) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
        
        // Allow access to auth pages without token
        if (isAuthPage) {
          return true;
        }
        
        // Protect all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
