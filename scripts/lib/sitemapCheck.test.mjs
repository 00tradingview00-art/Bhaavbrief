import { describe, test, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { countSitemapUrls, checkSitemapShape, expectedSitemapCount } from "./sitemapCheck.mjs";

const BASE = "https://bhaavbrief.in";

function sitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`).join("\n")}
</urlset>`;
}

const cleanUrls = [
  BASE,
  `${BASE}/briefs`,
  ...Array.from({ length: 100 }, (_, i) => `${BASE}/briefs/2026-07-${String((i % 28) + 1).padStart(2, "0")}-edition-${i}`),
  `${BASE}/arcs/gold-safe-haven`,
  `${BASE}/events/eia-natural-gas-storage-2026-07-15`,
];

describe("countSitemapUrls", () => {
  test("counts <loc> entries", () => {
    expect(countSitemapUrls(sitemapXml(cleanUrls))).toBe(104);
  });

  test("zero for empty/garbage input", () => {
    expect(countSitemapUrls("")).toBe(0);
    expect(countSitemapUrls("<html>not a sitemap</html>")).toBe(0);
  });
});

describe("checkSitemapShape", () => {
  test("clean sitemap within tolerance passes", () => {
    expect(checkSitemapShape(sitemapXml(cleanUrls), 105)).toEqual([]);
  });

  test("exact match passes", () => {
    expect(checkSitemapShape(sitemapXml(cleanUrls), 104)).toEqual([]);
  });

  test("flash URL flagged even when count is within tolerance", () => {
    const urls = [...cleanUrls.slice(0, -1), `${BASE}/flash/gold-spikes-0842`];
    const issues = checkSitemapShape(sitemapXml(urls), 104);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/flash\|\/articles/);
    expect(issues[0]).toContain("/flash/gold-spikes-0842");
  });

  test("articles URL flagged", () => {
    const urls = [...cleanUrls, `${BASE}/articles/some-auto-article`];
    const issues = checkSitemapShape(sitemapXml(urls), 105);
    expect(issues.some((i) => i.includes("/articles/some-auto-article"))).toBe(true);
  });

  test("the 467-URL regression (flash/articles re-added) is flagged on both axes", () => {
    const bloated = [
      ...cleanUrls,
      ...Array.from({ length: 284 }, (_, i) => `${BASE}/flash/signal-${i}`),
      ...Array.from({ length: 76 }, (_, i) => `${BASE}/articles/auto-${i}`),
    ];
    const issues = checkSitemapShape(sitemapXml(bloated), 104);
    expect(issues.some((i) => i.includes("360 /flash|/articles URL(s)"))).toBe(true);
    expect(issues.some((i) => i.includes("464 URLs, expected 104"))).toBe(true);
  });

  test("count collapse (fallback single-URL sitemap) is flagged", () => {
    const issues = checkSitemapShape(sitemapXml([BASE]), 104);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/1 URLs, expected 104/);
  });

  test("empty sitemap flagged without throwing", () => {
    expect(checkSitemapShape("", 104)).toEqual([
      "M-07: sitemap.xml has zero <loc> entries — empty or unparseable",
    ]);
    expect(checkSitemapShape("<html>vercel error page</html>", 104)).toHaveLength(1);
  });

  test("tolerance is respected", () => {
    expect(checkSitemapShape(sitemapXml(cleanUrls), 106)).toEqual([]); // |104-106| = 2, ok
    expect(checkSitemapShape(sitemapXml(cleanUrls), 107)).toHaveLength(1); // 3 > 2
    expect(checkSitemapShape(sitemapXml(cleanUrls), 110, { tolerance: 6 })).toEqual([]);
  });

  test("non-finite expected count skips the count assertion but keeps the exclusion check", () => {
    expect(checkSitemapShape(sitemapXml(cleanUrls), NaN)).toEqual([]);
    const withFlash = checkSitemapShape(sitemapXml([...cleanUrls, `${BASE}/flash/x`]), NaN);
    expect(withFlash).toHaveLength(1);
  });
});

describe("expectedSitemapCount", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-check-"));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  function writeFixture({ briefs, unpublishedBriefs = 0, events = 0, arcs = 0, statics = 3 }) {
    for (const entry of fs.readdirSync(tmp)) fs.rmSync(path.join(tmp, entry), { recursive: true, force: true });
    fs.mkdirSync(path.join(tmp, "content/briefs"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "content/events"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "app/sitemap.xml"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "data"), { recursive: true });
    for (let i = 0; i < briefs; i++)
      fs.writeFileSync(path.join(tmp, `content/briefs/edition-${i}.mdx`), `---\ntitle: E${i}\n---\nbody`);
    for (let i = 0; i < unpublishedBriefs; i++)
      fs.writeFileSync(path.join(tmp, `content/briefs/draft-${i}.mdx`), `---\ntitle: D${i}\npublished: false\n---\nbody`);
    for (let i = 0; i < events; i++)
      fs.writeFileSync(path.join(tmp, `content/events/event-${i}.mdx`), `---\ntitle: Ev${i}\n---\nbody`);
    fs.writeFileSync(
      path.join(tmp, "data/story-arcs.json"),
      JSON.stringify({ arcs: Array.from({ length: arcs }, (_, i) => ({ id: `arc-${i}` })) })
    );
    const staticEntries = Array.from(
      { length: statics },
      (_, i) => `  { url: \`\${BASE}/page-${i}\`, priority: '0.5', changefreq: 'daily' },`
    ).join("\n");
    fs.writeFileSync(
      path.join(tmp, "app/sitemap.xml/route.ts"),
      `const BASE = 'x'\nconst STATIC_PAGES = [\n${staticEntries}\n]\n`
    );
  }

  test("sums statics + published briefs + arcs + events, skipping published:false", () => {
    writeFixture({ briefs: 5, unpublishedBriefs: 2, events: 1, arcs: 4, statics: 3 });
    expect(expectedSitemapCount({ root: tmp })).toBe(3 + 5 + 4 + 1);
  });

  test("missing arcs file contributes 0 instead of throwing", () => {
    writeFixture({ briefs: 2, statics: 3 });
    fs.rmSync(path.join(tmp, "data/story-arcs.json"));
    expect(expectedSitemapCount({ root: tmp })).toBe(3 + 2);
  });

  test("against the real repo: matches route composition and is in a sane band", () => {
    const n = expectedSitemapCount();
    // 39 statics + ~68 briefs + 6 arcs + 1 event as of 2026-07-21; grows ~1/weekday.
    // A wide band so this test states "the wiring works", not today's exact corpus.
    expect(n).toBeGreaterThan(80);
    expect(n).toBeLessThan(250);
  });

  test("throws loudly if STATIC_PAGES can no longer be found in the route source", () => {
    writeFixture({ briefs: 1 });
    fs.writeFileSync(path.join(tmp, "app/sitemap.xml/route.ts"), "export async function GET() {}\n");
    expect(() => expectedSitemapCount({ root: tmp })).toThrow(/STATIC_PAGES/);
  });
});
