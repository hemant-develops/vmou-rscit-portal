export function postgresConnectionOptions(connectionString: string | undefined) {
  const normalizedConnectionString = normalizeConnectionString(connectionString);

  return {
    connectionString: normalizedConnectionString,
    ssl: isRdsConnection(connectionString) ? { rejectUnauthorized: false } : undefined
  };
}

export function normalizeConnectionString(connectionString: string | undefined) {
  if (!connectionString) return connectionString;
  if (!isRdsConnection(connectionString)) return connectionString;

  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function isRdsConnection(connectionString: string | undefined) {
  return Boolean(connectionString?.includes("rds.amazonaws.com"));
}
