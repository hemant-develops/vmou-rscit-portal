import { loadDatabaseEnv } from "../src/lib/db/env.ts";

const envValues = loadDatabaseEnv();
const secretKey = process.env.CLERK_SECRET_KEY ?? envValues.CLERK_SECRET_KEY;
const adminEmails = readAdminEmails(process.env.ADMIN_EMAILS ?? envValues.ADMIN_EMAILS, process.env.ADMIN_EMAIL ?? envValues.ADMIN_EMAIL);
const adminRole = (process.env.ADMIN_ROLE ?? envValues.ADMIN_ROLE ?? "admin").trim();
const bypassAdminCheck = process.env.BYPASS_ADMIN_CHECK ?? envValues.BYPASS_ADMIN_CHECK ?? "false";

if (!secretKey) {
  fail("Clerk: missing CLERK_SECRET_KEY.");
} else {
  await checkClerk();
}

async function checkClerk() {
  for (const adminEmail of adminEmails) {
    const usersResponse = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(adminEmail)}&limit=1`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!usersResponse.ok) {
      fail(`Clerk: failed for ${adminEmail} - ${usersResponse.status} ${usersResponse.statusText}`);
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
      fail(`Clerk: admin user not found for ${adminEmail}.`);
      continue;
    }

    const role = typeof user.public_metadata?.role === "string" ? user.public_metadata.role.trim() : "";

    console.log("Clerk: reachable");
    console.log(`Admin email: ${adminEmail}`);
    console.log(`Admin role: ${role || "missing"}`);
    console.log(`Required role: ${adminRole}`);
    console.log(`Bypass admin check: ${bypassAdminCheck}`);

    if (role !== adminRole) {
      fail(`Clerk: ${adminEmail} public_metadata.role must be "${adminRole}".`);
    }
  }
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function fail(message: string) {
  console.error(message);
  process.exitCode = 1;
}

function readAdminEmails(adminEmails: string | undefined, adminEmail: string | undefined) {
  const values = [adminEmails, adminEmail]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(","))
    .map((value) => normalizeEmail(value))
    .filter(Boolean);

  return values.length ? values : ["hemantswami4412@gmail.com"];
}
