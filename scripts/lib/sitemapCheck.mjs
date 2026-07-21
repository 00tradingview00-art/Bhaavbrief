/**
 * scripts/lib/sitemapCheck.mjs — M-07 sitemap-shape check, pure functions for
 * scripts/synthetic-monitor.mjs (see scripts/lib/sitemapCheck.test.mjs).
 *
 * Guards the 2026-07-21 sitemap trim (467 → ~107 URLs): /flash and /articles
 * were removed from sitemap.xml and noindex'd after 77% of the sitemap turned
 * out to be news-feed items Google would never index (the June "Discovered –
 * not indexed" backlog). A later deploy that re-adds them — or any change that
 * silently balloons the URL count — should page, not sit unnoticed until the
 * next GSC review.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** @returns {number} count of <loc> entries in a sitemap XML string */
export function countSitemapUrls(xml) {
  return (String(xml).match(/<loc>/g) ?? []).length;
}

/**
 * @param {string} xml - live sitemap.xml body
 * @param {number} expectedCount - from expectedSitemapCount()
 * @param {{tolerance?: number}} [opts] - ±2 default absorbs ISR cache lag
 *   (route revalidates hourly; the pipeline adds ~1 brief per weekday)
 * @returns {string[]} issue messages, empty if the sitemap is clean
 */
export function checkSitemapShape(xml, expectedCount, { tolerance = 2 } = {}) {
  const issues = [];
  const locs = [...String(xml).matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

  if (locs.length === 0) {
    issues.push("M-07: sitemap.xml has zero <loc> entries — empty or unparseable");
    return issues;
  }

  const excluded = locs.filter((u) => /\/(flash|articles)\//.test(u));
  if (excluded.length > 0) {
    issues.push(
      `M-07: sitemap.xml contains ${excluded.length} /flash|/articles URL(s) — these were deliberately excluded 2026-07-21 (first: ${excluded[0]})`
    );
  }

  if (Number.isFinite(expectedCount) && Math.abs(locs.length - expectedCount) > tolerance) {
    issues.push(
      `M-07: sitemap.xml has ${locs.length} URLs, expected ${expectedCount} ±${tolerance} — count jumped or collapsed unexpectedly`
    );
  }

  return issues;
}

function countPublishedMdx(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .filter((f) => {
      // Mirrors lib/briefs.ts / lib/events.ts: frontmatter published !== false.
      try {
        return matter(fs.readFileSync(path.join(dir, f), "utf8")).data.published !== false;
      } catch {
        return true; // unparseable frontmatter still renders (and so is in the sitemap)
      }
    }).length;
}

/**
 * Expected sitemap URL count, composed from the same sources
 * app/sitemap.xml/route.ts uses: published briefs + published events + arcs +
 * the STATIC_PAGES list. The static count is read out of the route source
 * itself rather than hardcoded here, so adding a /learn page never requires
 * updating a second constant (C-01: one module per fact).
 *
 * @param {{root?: string}} [opts]
 * @returns {number}
 */
export function expectedSitemapCount({ root = process.cwd() } = {}) {
  const briefs = countPublishedMdx(path.join(root, "content/briefs"));
  const events = countPublishedMdx(path.join(root, "content/events"));

  let arcs = 0;
  try {
    arcs = JSON.parse(fs.readFileSync(path.join(root, "data/story-arcs.json"), "utf8")).arcs.length;
  } catch {
    // missing/malformed arcs file → contributes 0, same as the route's catch path
  }

  const routeSrc = fs.readFileSync(path.join(root, "app/sitemap.xml/route.ts"), "utf8");
  const staticBlock = routeSrc.match(/const STATIC_PAGES\s*=\s*\[([\s\S]*?)\n\]/);
  if (!staticBlock) {
    throw new Error("expectedSitemapCount: STATIC_PAGES array not found in app/sitemap.xml/route.ts");
  }
  const statics = (staticBlock[1].match(/\burl:/g) ?? []).length;

  return statics + briefs + arcs + events;
}
