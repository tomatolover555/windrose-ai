import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = path.join(root, "lib/generated");

const STATUS_ORDER = { verified: 0, likely: 1, unverified: 2, dead: 3 };

function writeIfChanged(filePath, value) {
  const json = JSON.stringify(value);
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (previous === json) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, json);
  return true;
}

export function embedBlogPosts() {
  const dir = path.join(root, "content/blog");
  const posts = {};
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (!file.endsWith(".md") || file.endsWith(".mdx")) continue;
    posts[file.slice(0, -3)] = fs.readFileSync(path.join(dir, file), "utf8");
  }
  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;
    posts[file.slice(0, -4)] = fs.readFileSync(path.join(dir, file), "utf8");
  }

  return posts;
}

function proofSummary(item) {
  const types = new Set((item.proof ?? []).map((proof) => String(proof.type)));
  return Array.from(types).sort();
}

export function buildWebmcpSnapshot() {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data/webmcp_directory.json"), "utf8"));
  const filtered = data.items.filter((item) => item.status === "verified" || item.status === "likely");

  filtered.sort((a, b) => {
    const statusOrder = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (statusOrder !== 0) return statusOrder;
    const confidenceOrder = b.confidence - a.confidence;
    if (confidenceOrder !== 0) return confidenceOrder;
    const seenOrder = String(b.last_seen).localeCompare(String(a.last_seen));
    if (seenOrder !== 0) return seenOrder;
    return String(a.domain).localeCompare(String(b.domain));
  });

  return {
    updated_at: data.updated_at,
    results: filtered.map((item) => ({
      domain: item.domain,
      type: item.type,
      verification_status: item.verification_status ?? "unverified",
      confidence: item.confidence,
      last_seen: item.last_seen,
      proof_summary: proofSummary(item),
    })),
  };
}

export function embedContent() {
  const posts = embedBlogPosts();
  const snapshot = buildWebmcpSnapshot();
  writeIfChanged(path.join(outDir, "blog-posts.json"), posts);
  writeIfChanged(path.join(outDir, "webmcp-snapshot.json"), snapshot);
  console.log(
    `embed-content: ${Object.keys(posts).length} posts, ${snapshot.results.length} webmcp snapshot rows`
  );
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) embedContent();
