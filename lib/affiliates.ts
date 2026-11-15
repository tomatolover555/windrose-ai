import fs from "fs";
import path from "path";
import affiliateFile from "@/content/affiliates.json";

export const AFFILIATE_LINK_REL = "sponsored nofollow";

export type AffiliateProgram = {
  id: string;
  name: string;
  network?: string;
  url: string;
  status: "todo" | "active" | string;
  note?: string;
  context_tags: string[];
  disclosure?: string;
};

type AffiliateFile = {
  version?: string;
  linkRel?: string;
  programs?: AffiliateProgram[];
};

let cached: AffiliateProgram[] | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function loadAffiliatePrograms(): AffiliateProgram[] {
  if (cached) return cached;

  let parsed = affiliateFile as AffiliateFile;
  try {
    const filePath = path.join(process.cwd(), "content", "affiliates.json");
    if (fs.existsSync(filePath)) {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as AffiliateFile;
    }
  } catch {
    parsed = affiliateFile as AffiliateFile;
  }
  const programs = Array.isArray(parsed.programs) ? parsed.programs : [];

  cached = programs.filter(isRecord).map((program) => ({
    id: String(program.id ?? ""),
    name: String(program.name ?? ""),
    network: typeof program.network === "string" ? program.network : undefined,
    url: typeof program.url === "string" ? program.url.trim() : "",
    status: typeof program.status === "string" ? program.status : "todo",
    note: typeof program.note === "string" ? program.note : undefined,
    context_tags: Array.isArray(program.context_tags)
      ? program.context_tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    disclosure: typeof program.disclosure === "string" ? program.disclosure : undefined,
  }));

  return cached;
}

export function isActiveAffiliateUrl(url: string): boolean {
  return /^https:\/\/\S+$/.test(url);
}

/** Programs that may be linked. A TODO or empty URL never qualifies. */
export function activeAffiliatePrograms(): AffiliateProgram[] {
  return loadAffiliatePrograms().filter(
    (program) => program.status === "active" && isActiveAffiliateUrl(program.url)
  );
}

export function isAffiliateUrl(href: string): boolean {
  return activeAffiliatePrograms().some((program) => program.url === href);
}

export function affiliateLinksForPost(post: {
  affiliatePrograms?: string[];
  affiliate_links?: { url?: string }[];
}): AffiliateProgram[] {
  const active = activeAffiliatePrograms();
  const byId = new Map(active.map((program) => [program.id, program]));
  const byUrl = new Map(active.map((program) => [program.url, program]));
  const chosen: AffiliateProgram[] = [];
  const seen = new Set<string>();

  const add = (program: AffiliateProgram | undefined) => {
    if (!program || seen.has(program.id)) return;
    seen.add(program.id);
    chosen.push(program);
  };

  for (const id of post.affiliatePrograms ?? []) add(byId.get(id));
  for (const link of post.affiliate_links ?? []) {
    if (typeof link?.url === "string") add(byUrl.get(link.url));
  }

  return chosen;
}
