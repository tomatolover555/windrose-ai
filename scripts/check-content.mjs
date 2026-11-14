import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const affiliates = JSON.parse(read("content/affiliates.json"));
const programs = affiliates.programs || [];
if (affiliates.linkRel !== "sponsored nofollow") {
  fail("affiliates.json linkRel must be sponsored nofollow");
}
const base44 = programs.find((program) => program.id === "base44");
if (!base44) fail("base44 program missing");
if (base44 && (base44.url !== "" || base44.status !== "todo")) {
  fail("base44 must stay url-empty and status todo until a real Impact URL is added");
}
for (const program of programs) {
  if (program.url && !/^https:\/\/\S+$/.test(program.url)) {
    fail(`affiliate url must be empty or https: ${program.id}`);
  }
  if (/referral\/windrose|printful\.com\/a\/|ref=windrose|example-program/i.test(JSON.stringify(program))) {
    fail(`placeholder affiliate data in ${program.id}`);
  }
}

const removedIds = ["vercel", "printful", "openrouter"];
for (const id of removedIds) {
  if (programs.some((program) => program.id === id)) fail(`removed placeholder program still present: ${id}`);
}

const redirects = JSON.parse(read("content/post-redirects.json"));
const blogDir = path.join(root, "content/blog");
const slugs = new Set(
  fs
    .readdirSync(blogDir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.(mdx|md)$/, ""))
);

for (const [from, to] of Object.entries(redirects)) {
  if (slugs.has(from)) fail(`redirect source still published: ${from}`);
  if (!slugs.has(to)) fail(`redirect target missing: ${to}`);
  if (from === to) fail(`redirect loops: ${from}`);
}

const site = read("lib/site.ts");
if (!site.includes('name: "Windrose Editorial"')) fail("default author name missing");
if (!site.includes("bio:")) fail("author bio missing from the same config");
if (!site.includes("G-BXKR6NMBT7")) fail("GA4 id missing from site config");

const workflow = read(".github/workflows/generate-post.yml");
if (/^\s*schedule:/m.test(workflow) || /cron:/.test(workflow)) {
  fail("generate-post workflow still has a schedule");
}
if (!workflow.includes("workflow_dispatch:")) fail("generate-post workflow_dispatch missing");

const scan = read(".github/workflows/scan-webmcp-directory.yml");
if (!scan.includes('cron: "17 3 * * 1"')) fail("webmcp scan is not weekly");
if (scan.includes('cron: "17 3 * * *"')) fail("webmcp scan is still daily");

const banned = [
  "vercel.com/referral/windrose",
  "printful.com/a/windrose",
  "openrouter.ai/?ref=windrose",
  "example-program",
];
const scanRoots = ["content/blog", "content/affiliates.json", "app", "lib"];
function walk(rel, acc = []) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return acc;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(full)) walk(path.join(rel, entry), acc);
    return acc;
  }
  acc.push(rel);
  return acc;
}
for (const rel of scanRoots.flatMap((entry) => walk(entry))) {
  if (!/\.(mdx|md|ts|tsx|js|json|yml)$/.test(rel)) continue;
  const text = read(rel);
  for (const needle of banned) {
    if (text.includes(needle)) fail(`${rel} still contains ${needle}`);
  }
}

const reserved = new Set([
  "about",
  "contact",
  "privacy",
  "affiliate-disclosure",
  "page",
  "p",
  "category",
  "tag",
  "agent",
]);
const linkRe = /\/blog\/([a-z0-9-]+)/g;
for (const file of fs.readdirSync(blogDir)) {
  const text = fs.readFileSync(path.join(blogDir, file), "utf8");
  for (const match of text.matchAll(linkRe)) {
    const slug = match[1];
    if (reserved.has(slug) || slugs.has(slug) || Object.prototype.hasOwnProperty.call(redirects, slug)) {
      continue;
    }
    fail(`${file} links to missing /blog/${slug}`);
  }
}

const layout = read("app/layout.tsx");
if (!layout.includes("G-BXKR6NMBT7")) fail("GA4 snippet missing from root layout");

if (failed) process.exit(1);
console.log(`ok posts=${slugs.size} redirects=${Object.keys(redirects).length} programs=${programs.length}`);
