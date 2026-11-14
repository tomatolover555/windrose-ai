import postRedirects from "../content/post-redirects.json";

/** Old post slug → kept post slug. Served as permanent redirects (308). */
export const POST_REDIRECTS: Record<string, string> = postRedirects;

export function redirectTarget(slug: string): string | null {
  return POST_REDIRECTS[slug] ?? null;
}
