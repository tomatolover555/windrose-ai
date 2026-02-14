import fs from "node:fs/promises";
import path from "node:path";
import type { AgenticFrameworkDefinition, AgenticResult, JsonValue } from "@/lib/agentic/types";

type Pricing = "free" | "freemium" | "paid" | "enterprise" | "unknown";

type DirectoryEntry = {
  name: string;
  url: string;
  summary: string;
  category: string;
  tags: string[];
  pricing: Pricing;
};

type SearchInput = {
  query: string;
  category?: string;
  tags?: string[];
  budget?: "free" | "freemium" | "paid" | "enterprise" | "any";
  limit?: number;
};

declare global {
  var __windroseDirectoryDataset: DirectoryEntry[] | undefined;
}

async function loadDataset(): Promise<DirectoryEntry[]> {
  if (globalThis.__windroseDirectoryDataset) return globalThis.__windroseDirectoryDataset;

  const filePath = path.join(process.cwd(), "data", "directory.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as DirectoryEntry[];
  globalThis.__windroseDirectoryDataset = parsed;
  return parsed;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function asSearchInput(input: JsonValue | null): SearchInput {
  const obj = (input && typeof input === "object" && !Array.isArray(input) ? input : null) as
    | Record<string, unknown>
    | null;

  const query = typeof obj?.query === "string" ? obj.query : "";
  const category = typeof obj?.category === "string" ? obj.category : undefined;
  const budget =
    obj?.budget === "free" ||
    obj?.budget === "freemium" ||
    obj?.budget === "paid" ||
    obj?.budget === "enterprise" ||
    obj?.budget === "any"
      ? obj.budget
      : "any";
  const tags = Array.isArray(obj?.tags)
    ? (obj?.tags.filter((t) => typeof t === "string").map(String) as string[])
    : undefined;
  const limitNum = typeof obj?.limit === "number" ? obj.limit : undefined;
  const limit = limitNum !== undefined ? Math.max(1, Math.min(50, Math.floor(limitNum))) : 10;

  if (!query) {
    throw new Error("Missing required field: query");
  }

  return { query, category, tags, budget, limit };
}

function matchesBudget(entry: DirectoryEntry, budget: SearchInput["budget"]): boolean {
  if (!budget || budget === "any") return true;
  return entry.pricing === budget;
}

function matchesTags(entry: DirectoryEntry, tags: string[] | undefined): boolean {
  if (!tags || tags.length === 0) return true;
  const entryTags = new Set(entry.tags.map(normalize));
  return tags.map(normalize).every((t) => entryTags.has(t));
}

function matchesCategory(entry: DirectoryEntry, category: string | undefined): boolean {
  if (!category) return true;
  return normalize(entry.category) === normalize(category);
}

function scoreEntry(entry: DirectoryEntry, q: string): number {
  const nq = normalize(q);
  const name = normalize(entry.name);
  const summary = normalize(entry.summary);
  const category = normalize(entry.category);
  const tags = entry.tags.map(normalize);

  let score = 0;

  if (name === nq) score += 200;
  if (name.includes(nq)) score += 120;
  if (tags.includes(nq)) score += 80;
  if (category.includes(nq)) score += 50;
  if (summary.includes(nq)) score += 30;

  // Extra credit for matching multiple tokens.
  const tokens = nq.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (name.includes(t)) score += 10;
    if (tags.some((x) => x.includes(t))) score += 6;
    if (summary.includes(t)) score += 3;
  }

  return score;
}

export const directorySearchFramework: AgenticFrameworkDefinition = {
  id: "directory.search",
  name: "Directory Search",
  description: "Search a curated local directory dataset by query, tags, and category.",
  enabled: true,
  async handler(context): Promise<AgenticResult> {
    const input = asSearchInput(context.input);
    const dataset = await loadDataset();

    const nq = normalize(input.query);

    const filtered = dataset
      .filter((e) => matchesCategory(e, input.category))
      .filter((e) => matchesTags(e, input.tags))
      .filter((e) => matchesBudget(e, input.budget));

    const scored = filtered
      .map((e) => ({ e, score: scoreEntry(e, nq) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));

    const total = scored.length;
    const limit = input.limit ?? 10;
    const results = scored.slice(0, limit).map((x) => x.e);

    return { results, total };
  },
};

