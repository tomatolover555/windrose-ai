const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

const checks = [
  { path: "/", expected: 200 },
  { path: "/feed.xml", expected: 200 },
  { path: "/sitemap.xml", expected: 200 },
  { path: "/blog/non-existent-post-for-qa", expected: 404 },
];

async function main() {
  let failed = false;

  for (const check of checks) {
    const url = new URL(check.path, baseUrl).toString();
    try {
      const response = await fetch(url, { redirect: "manual" });
      console.log(`${response.status} ${check.path}`);
      if (response.status !== check.expected) {
        failed = true;
        console.error(`Expected ${check.expected} for ${check.path}, got ${response.status}`);
      }
    } catch (error) {
      failed = true;
      console.error(`Request failed for ${check.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main();
