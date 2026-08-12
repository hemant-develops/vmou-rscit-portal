import { spawnSync } from "node:child_process";
import { loadDatabaseEnv } from "../src/lib/db/env.ts";

const envValues = loadDatabaseEnv();
const databaseUrl = process.env.DATABASE_URL ?? envValues.DATABASE_URL ?? "";
const ingestDatabaseUrl = process.env.INGEST_DATABASE_URL ?? envValues.INGEST_DATABASE_URL ?? "";
const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? envValues.AWS_REGION ?? envValues.AWS_DEFAULT_REGION ?? regionFromDatabaseUrl(databaseUrl) ?? "";
const accessKey = process.env.AWS_ACCESS_KEY_ID ?? envValues.AWS_ACCESS_KEY_ID ?? "";
const secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? envValues.AWS_SECRET_ACCESS_KEY ?? "";
const awsCommand = findAwsCommand();
const aws = awsCommand ? spawnSync(awsCommand, ["--version"], { encoding: "utf8" }) : null;

console.log(`AWS CLI: ${!aws || aws.error ? "missing" : (aws.stdout || aws.stderr).trim()}`);
console.log(`AWS region: ${region || "missing"}`);
console.log(`AWS access key: ${accessKey ? "set" : "missing"}`);
console.log(`AWS secret key: ${secretKey ? "set" : "missing"}`);
console.log(`DATABASE_URL target: ${classifyDatabaseUrl(databaseUrl)}`);
console.log(`INGEST_DATABASE_URL target: ${classifyDatabaseUrl(ingestDatabaseUrl)}`);

const identity = !awsCommand ? null : spawnSync(awsCommand, ["sts", "get-caller-identity"], { encoding: "utf8" });
if (identity) {
  console.log(`AWS identity: ${identity.status === 0 ? "reachable" : "not authenticated"}`);
}

if (!aws || aws.error || identity?.status !== 0 || !databaseUrl.includes("rds.amazonaws.com") || !ingestDatabaseUrl.includes("rds.amazonaws.com")) {
  process.exitCode = 1;
}

function classifyDatabaseUrl(value: string) {
  if (!value) return "missing";
  if (value.includes("rds.amazonaws.com")) return "AWS RDS";
  if (/localhost|127\.0\.0\.1/.test(value)) return "local";
  return "configured";
}

function regionFromDatabaseUrl(value: string) {
  const match = value.match(/\.([a-z]{2}-[a-z]+-\d)\.rds\.amazonaws\.com/i);
  return match?.[1];
}

function findAwsCommand() {
  const candidates = [
    "aws",
    `${process.env.LOCALAPPDATA}\\Programs\\Amazon\\AWSCLIV2\\aws.exe`,
    `${process.env.ProgramFiles}\\Amazon\\AWSCLIV2\\aws.exe`
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (!result.error) return candidate;
  }

  return "";
}
