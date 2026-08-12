export function databaseErrorMessage(error: unknown) {
  const text = collectErrorText(error);

  if (text.includes("ECONNREFUSED")) {
    return "PostgreSQL is not running or DATABASE_URL is not reachable.";
  }

  if (text.includes("mdbtools") || text.includes("mdb-tables") || text.includes("mdb-export")) {
    return text;
  }

  if (text.includes('relation "exam_events" does not exist') || text.includes('relation "results" does not exist')) {
    return "Database tables are not created yet. Run the Drizzle migration first.";
  }

  return "Database request failed.";
}

function collectErrorText(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();

  function visit(value: unknown) {
    if (!value || seen.has(value)) return;
    seen.add(value);

    if (value instanceof Error) {
      parts.push(value.message);
      visit(value.cause);
      const record = value as Error & { code?: unknown; errors?: unknown };
      if (typeof record.code === "string") parts.push(record.code);
      if (Array.isArray(record.errors)) record.errors.forEach(visit);
      return;
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.message === "string") parts.push(record.message);
      if (typeof record.code === "string") parts.push(record.code);
      visit(record.cause);
      if (Array.isArray(record.errors)) record.errors.forEach(visit);
      return;
    }

    parts.push(String(value));
  }

  visit(error);
  return parts.join(" ");
}
