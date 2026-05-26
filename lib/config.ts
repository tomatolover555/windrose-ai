function parseEnabledFrameworks(value: string | undefined): Set<string> {
  if (!value) return new Set();
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(ids);
}

export function getEnabledFrameworkAllowlist(): Set<string> {
  return parseEnabledFrameworks(process.env.ENABLED_FRAMEWORKS);
}
