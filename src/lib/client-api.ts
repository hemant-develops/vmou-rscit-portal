export async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error(response.ok ? "Server returned an invalid response." : `Request failed with status ${response.status}.`);
  }
}
