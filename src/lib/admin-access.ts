import { clerkClient } from "@clerk/nextjs/server";
import type { NextResponse } from "next/server";
import { getCurrentClerkSession } from "@/lib/clerk-session";

const FALLBACK_ADMIN_EMAIL = "hemantswami4412@gmail.com";
const DEFAULT_ADMIN_ROLE = "admin";
const ACCESS_CACHE_TTL_MS = 10 * 60 * 1000;

const userAccessCache = new Map<
  string,
  {
    expiresAt: number;
    access?: ClerkAdminAccess;
    pending?: Promise<ClerkAdminAccess>;
  }
>();

export function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

export function adminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL) || FALLBACK_ADMIN_EMAIL;
}

export function adminEmails() {
  const configured = [
    process.env.ADMIN_EMAILS,
    process.env.ADMIN_EMAIL,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(","))
    .map((email) => normalizeEmail(email))
    .filter(Boolean);

  if (configured.length) {
    return configured;
  }

  const fallback = adminEmail();
  return fallback ? [fallback] : [];
}

export function adminRole() {
  return process.env.ADMIN_ROLE?.trim() || DEFAULT_ADMIN_ROLE;
}

export function hasExplicitAdminRole() {
  return Boolean(process.env.ADMIN_ROLE?.trim());
}

export function bypassAdminCheck() {
  return process.env.BYPASS_ADMIN_CHECK === "true";
}

export function readSessionEmail(
  sessionClaims: Record<string, unknown> | undefined
) {
  const candidates = [
    sessionClaims?.email,
    sessionClaims?.email_address,
    sessionClaims?.primary_email,
    sessionClaims?.preferred_username,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeEmail(candidate);
    }
  }

  return "";
}

export function readSessionRole(
  sessionClaims: Record<string, unknown> | undefined
) {
  const metadata = sessionClaims?.metadata;
  const publicMetadata = sessionClaims?.publicMetadata;

  const candidates = [
    sessionClaims?.role,
    isRecord(metadata) ? metadata.role : null,
    isRecord(publicMetadata) ? publicMetadata.role : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

export type ClerkAdminAccess = {
  allowed: boolean;
  email: string;
  role: string;
};

export async function resolveClerkUserAccess(
  userId: string | null | undefined
): Promise<ClerkAdminAccess> {
  if (!userId) {
    return {
      allowed: false,
      email: "",
      role: "",
    };
  }

  const cached = userAccessCache.get(userId);
  const now = Date.now();

  if (cached?.access && cached.expiresAt > now) {
    return cached.access;
  }

  if (cached?.pending) {
    return cached.pending;
  }

  const pending = fetchClerkUserAccess(userId)
    .then((access) => {
      userAccessCache.set(userId, {
        access,
        expiresAt: Date.now() + ACCESS_CACHE_TTL_MS,
      });
      return access;
    })
    .catch((error) => {
      userAccessCache.delete(userId);
      throw error;
    });

  userAccessCache.set(userId, {
    expiresAt: 0,
    pending,
  });

  return pending;
}

async function fetchClerkUserAccess(userId: string): Promise<ClerkAdminAccess> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email = normalizeEmail(
    user.emailAddresses.find(
      (emailAddress) =>
        emailAddress.id === user.primaryEmailAddressId
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress
  );

  const role =
    typeof user.publicMetadata?.role === "string"
      ? user.publicMetadata.role.trim()
      : "";

  return {
    allowed:
      adminEmails().includes(email) &&
      role === adminRole(),
    email,
    role,
  };
}

export async function resolveClerkUserEmail(
  userId: string | null | undefined
) {
  return (await resolveClerkUserAccess(userId)).email;
}

export async function isCurrentAdmin() {
  if (bypassAdminCheck()) {
    return true;
  }

  const authObject = await getCurrentClerkSession();

  if (!authObject) {
    return false;
  }

  const sessionEmail = readSessionEmail(authObject.sessionClaims);
  const sessionRole = readSessionRole(authObject.sessionClaims);
  const allowedAdminEmails = adminEmails();

  if (!hasExplicitAdminRole() && sessionEmail && allowedAdminEmails.includes(sessionEmail)) {
    return true;
  }

  if (sessionEmail && sessionRole) {
    return (
      allowedAdminEmails.includes(sessionEmail) &&
      sessionRole === adminRole()
    );
  }

  const access = await resolveClerkUserAccess(authObject.userId);

  return access.allowed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function requireAdminJson() {
  const { NextResponse } = await import("next/server");
  const { headers } = await import("next/headers");

  const headersList = await headers();

  if (headersList.get("x-vmou-admin-verified") === "1") {
    return null;
  }

  if (await isCurrentAdmin()) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 403 }
  ) as NextResponse;
}
