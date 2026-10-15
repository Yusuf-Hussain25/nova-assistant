import { NextResponse, type NextRequest } from "next/server";
import { VISITOR_COOKIE } from "@/lib/visitor-cookie";

// Every visitor gets an anonymous, long-lived id. No sign-up wall:
// history and settings hang off this id.
export function proxy(request: NextRequest) {
  if (request.cookies.has(VISITOR_COOKIE)) return NextResponse.next();

  const id = crypto.randomUUID();
  request.cookies.set(VISITOR_COOKIE, id);
  const response = NextResponse.next({ request });
  response.cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
