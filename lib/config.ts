function parseEnabledFrameworks(value: string | undefined): Set<string> | null {
  if (!value) return null;
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return null;
  return new Set(ids);
}

export function getEnabledFrameworkAllowlist(): Set<string> | null {
  return parseEnabledFrameworks(process.env.ENABLED_FRAMEWORKS);
}

