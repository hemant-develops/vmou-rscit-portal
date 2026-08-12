import { loadDatabaseEnv } from "../src/lib/db/env.ts";

const envValues = loadDatabaseEnv();
const secretKey = process.env.CLERK_SECRET_KEY ?? envValues.CLERK_SECRET_KEY;
const adminEmails = readAdminEmails(process.env.ADMIN_EMAILS ?? envValues.ADMIN_EMAILS, process.env.ADMIN_EMAIL ?? envValues.ADMIN_EMAIL);
const adminRole = (process.env.ADMIN_ROLE ?? envValues.ADMIN_ROLE ?? "admin").trim();

if (!secretKey) {
  console.error("Clerk: missing CLERK_SECRET_KEY.");
  process.exit(1);
}

for (const adminEmail of adminEmails) {
  const usersResponse = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(adminEmail)}&limit=1`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!usersResponse.ok) {
    console.error(`Clerk: lookup failed for ${adminEmail} - ${usersResponse.status} ${usersResponse.statusText}`);
    process.exitCode = 1;
    continue;
  }

  const users = await usersResponse.json() as Array<{
    id: string;
    email_addresses?: Array<{ email_address?: string }>;
    public_metadata?: Record<string, unknown>;
  }>;
  const user = users.find((candidate) =>
    candidate.email_addresses?.some((email) => normalizeEmail(email.email_address) === adminEmail)
  );

  if (!user) {
    console.error(`Clerk: admin user not found for ${adminEmail}.`);
    process.exitCode = 1;
    continue;
  }

  const existingMetadata = user.public_metadata ?? {};
  const existingRole = typeof existingMetadata.role === "string" ? existingMetadata.role.trim() : "";

  if (existingRole === adminRole) {
    console.log(`Clerk: ${adminEmail} already has public_metadata.role="${adminRole}".`);
    continue;
  }

  const patchResponse = await fetch(`https://api.clerk.com/v1/users/${user.id}/metadata`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      public_metadata: {
        ...existingMetadata,
        role: adminRole
      }
    })
  });

  if (!patchResponse.ok) {
    console.error(`Clerk: metadata update failed for ${adminEmail} - ${patchResponse.status} ${patchResponse.statusText}`);
    process.exitCode = 1;
    continue;
  }

  console.log(`Clerk: set ${adminEmail} public_metadata.role="${adminRole}".`);
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function readAdminEmails(adminEmails: string | undefined, adminEmail: string | undefined) {
  const values = [adminEmails, adminEmail]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(","))
    .map((value) => normalizeEmail(value))
    .filter(Boolean);

  return values.length ? values : ["hemantswami4412@gmail.com"];
}
