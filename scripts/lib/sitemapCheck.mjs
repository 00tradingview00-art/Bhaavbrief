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
 *
 * One deliberate, explicit exception to that exclusion exists:
 * EVERGREEN_ARTICLE_SLUGS in app/sitemap.xml/route.ts, a small hand-picked
 * allowlist of articles worth long-term sitemap presence (added 2026-11-23).
 * This check reads that same array out of the route source (C-01: one
 * module per fact) so a deliberate addition there is never confused with the
 * bulk regression this file exists to catch.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** @returns {number} count of <loc> entries in a sitemap XML string */
export function countSitemapUrls(xml) {
  return (String(xml).match(/<loc>/g) ?? []).length;
}

/**
 * Reads EVERGREEN_ARTICLE_SLUGS out of app/sitemap.xml/route.ts — the one
 * deliberate exception to the /flash|/articles exclusion below.
 * @param {string} root
 * @returns {string[]}
 */
function readEvergreenArticleSlugs(root) {
  let routeSrc;
  try {
    routeSrc = fs.readFileSync(path.join(root, "app/sitemap.xml/route.ts"), "utf8");
  } catch {
    return [];
  }
  const block = routeSrc.match(/const EVERGREEN_ARTICLE_SLUGS\s*=\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  return [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/**
 * @param {string} xml - live sitemap.xml body
 * @param {number} expectedCount - from expectedSitemapCount()
 * @param {{tolerance?: number, root?: string}} [opts] - tolerance (±2 default)
 *   absorbs ISR cache lag (route revalidates hourly; the pipeline adds ~1
 *   brief per weekday); root locates app/sitemap.xml/route.ts to read the
 *   evergreen-article allowlist from (defaults to cwd).
 * @returns {string[]} issue messages, empty if the sitemap is clean
 */
export function checkSitemapShape(xml, expectedCount, { tolerance = 2, root = process.cwd() } = {}) {
  const issues = [];
  const locs = [...String(xml).matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

  if (locs.length === 0) {
    issues.push("M-07: sitemap.xml has zero <loc> entries — empty or unparseable");
    return issues;
  }

  const allowedArticleUrls = new Set(
    readEvergreenArticleSlugs(root).map((slug) => `/articles/${slug}`)
  );
  const excluded = locs.filter(
    (u) => /\/(flash|articles)\//.test(u) && ![...allowedArticleUrls].some((a) => u.endsWith(a))
  );
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

// Mirrors lib/research.ts getAllResearch(): only `published: true` counts
// (stricter than briefs/events, which count unless published === false).
function countResearchInSitemap(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .filter((f) => {
      try {
        return matter(fs.readFileSync(path.join(dir, f), "utf8")).data.published === true;
      } catch {
        return false;
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

  // Published research pages are listed too (app/sitemap.xml/route.ts); they
  // were missing from this count, so the live sitemap (183) always ran 3
  // over the expected value — beyond the ±2 tolerance.
  const research = countResearchInSitemap(path.join(root, "content/research"));

  const routeSrc = fs.readFileSync(path.join(root, "app/sitemap.xml/route.ts"), "utf8");
  const staticBlock = routeSrc.match(/const STATIC_PAGES\s*=\s*\[([\s\S]*?)\n\]/);
  if (!staticBlock) {
    throw new Error("expectedSitemapCount: STATIC_PAGES array not found in app/sitemap.xml/route.ts");
  }
  const statics = (staticBlock[1].match(/\burl:/g) ?? []).length;
  const evergreenArticles = readEvergreenArticleSlugs(root).length;

  return statics + briefs + arcs + events + research + evergreenArticles;
}
