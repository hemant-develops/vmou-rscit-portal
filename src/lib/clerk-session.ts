import { verifyToken } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

export type VerifiedClerkSession = {
  userId: string;
  sessionClaims: Record<string, unknown>;
};

export async function getCurrentClerkSession(): Promise<VerifiedClerkSession | null> {
  const token = await getClerkSessionToken();

  if (!token) {
    return null;
  }

  try {
    const sessionClaims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
    });

    if (typeof sessionClaims.sub !== "string" || !sessionClaims.sub) {
      return null;
    }

    return {
      userId: sessionClaims.sub,
      sessionClaims: sessionClaims as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

async function getClerkSessionToken() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get("__session") ??
    cookieStore.getAll().find((cookie) => cookie.name.startsWith("__session_"));

  if (sessionCookie?.value) {
    return sessionCookie.value;
  }

  const authorization = (await headers()).get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return null;
}
