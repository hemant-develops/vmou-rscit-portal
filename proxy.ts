import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  adminEmails,
  adminRole,
  bypassAdminCheck,
  hasExplicitAdminRole,
  readSessionEmail,
  readSessionRole,
  resolveClerkUserAccess,
} from "@/lib/admin-access";

const publicPrefixes = [
  "/sign-in",
  "/unauthorized",
  "/__clerk",
];

const publicPaths = new Set([
  "/robots.txt",
  "/sitemap.xml",
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.has(pathname) ||
    publicPrefixes.some(
      (prefix) =>
        pathname === prefix ||
        pathname.startsWith(`${prefix}/`)
    )
  ) {
    return NextResponse.next();
  }

  const authObject = await auth();

  if (!authObject.isAuthenticated) {
    console.log(
      "[clerk-middleware] Not authenticated, redirecting to sign-in"
    );

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);

    return NextResponse.redirect(signInUrl);
  }

  if (bypassAdminCheck()) {
    console.warn(
      "[clerk-proxy] BYPASS_ADMIN_CHECK=true; allowing authenticated user through"
    );

    return adminNext(request);
  }

  const allowedAdminEmails = adminEmails();
  const allowedAdminRole = adminRole();

  const sessionClaims =
    authObject.sessionClaims as
      | Record<string, unknown>
      | undefined;

  const sessionEmail = readSessionEmail(sessionClaims);
  const sessionRole = readSessionRole(sessionClaims);

  let resolvedEmail = sessionEmail;
  let resolvedRole = sessionRole;
  const canUseEmailOnlyAdmin =
    !hasExplicitAdminRole() &&
    Boolean(sessionEmail) &&
    allowedAdminEmails.includes(sessionEmail);

  if (
    !canUseEmailOnlyAdmin &&
    (!resolvedEmail || !resolvedRole) &&
    authObject.userId
  ) {
    const access = await resolveClerkUserAccess(
      authObject.userId
    );

    resolvedEmail ||= access.email;
    resolvedRole ||= access.role;
  }

  const isAllowed =
    canUseEmailOnlyAdmin ||
    (allowedAdminEmails.includes(resolvedEmail) &&
      resolvedRole === allowedAdminRole);

  // console.log("[clerk-proxy] Admin check:", {
  //   pathname,
  //   resolvedEmail,
  //   resolvedRole,
  //   allowedAdminEmails,
  //   allowedAdminRole,
  //   isAllowed,
  // });

  if (!isAllowed) {
    return NextResponse.redirect(
      new URL("/unauthorized", request.url)
    );
  }

  return adminNext(request);
});

function adminNext(request: Request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-vmou-admin-verified", "1");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next|__clerk|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
