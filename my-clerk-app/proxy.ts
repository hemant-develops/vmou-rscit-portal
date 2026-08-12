import { auth, clerkMiddleware, createRouteMatcher, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/"]);

export default clerkMiddleware(async (authFn, req) => {
  const isPublic = isPublicRoute(req);
  if (isPublic) {
    return NextResponse.next();
  }

  const { userId } = await authFn();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return NextResponse.next();
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase();

  if (!userEmail || userEmail !== adminEmail) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
