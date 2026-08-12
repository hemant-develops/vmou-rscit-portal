import { auth, clerkClient } from "@clerk/nextjs/server";
import type { NextResponse } from "next/server";

const FALLBACK_ADMIN_EMAIL = "hemantswami4412@gmail.com";
const DEFAULT_ADMIN_ROLE = "admin";

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

  const authObject = await auth();

  if (!authObject.isAuthenticated) {
    return false;
  }

  const sessionClaims =
    authObject.sessionClaims as Record<string, unknown> | undefined;

  const sessionEmail = readSessionEmail(sessionClaims);
  const sessionRole = readSessionRole(sessionClaims);

  if (sessionEmail && sessionRole) {
    return (
      adminEmails().includes(sessionEmail) &&
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

  if (await isCurrentAdmin()) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 403 }
  ) as NextResponse;
}
