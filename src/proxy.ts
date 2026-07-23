import { NextResponse, type NextRequest } from "next/server";
import { localeFromPathname, stripLocalePrefix } from "@/lib/locale";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/fr" || pathname.startsWith("/fr/")) {
    const destination = request.nextUrl.clone();
    destination.pathname = stripLocalePrefix(pathname);
    return NextResponse.redirect(destination, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-parigo-locale", localeFromPathname(pathname));

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const destination = request.nextUrl.clone();
    destination.pathname = stripLocalePrefix(pathname);
    return NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap(?:-[^/]+)?\\.xml|sitemaps/|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
