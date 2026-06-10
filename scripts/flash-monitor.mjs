#!/usr/bin/env node
/**
 * flash-monitor.mjs — event-driven flash generator for BhaavBrief
 *
 * Run every 15 min during MCX hours (via flash-brief.yml GitHub Actions).
 * Publishes ONLY when a trigger fires. Most runs exit silently — that is correct.
 * A feed with 3 real signals a day beats one with 20 pieces of filler.
 *
 * Usage:
 *   node scripts/flash-monitor.mjs
 *   (reads data/market-snapshot.json and data/flash-state.json; writes content/flash/)
 *
 * Env: ANTHROPIC_API_KEY
 * Exit 0 always — a no-trigger run is success, not failure.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SNAPSHOT_FILE  = path.join(ROOT, "data/market-snapshot.json");

// Load .env.local for local dev runs (same pattern as fetch-snapshot.mjs)
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join("=").trim();
  }
}
const STATE_FILE     = path.join(ROOT, "data/flash-state.json");
const FLASH_DIR      = path.join(ROOT, "content/flash");

// ---------------------------------------------------------------------------
// Config — tune thresholds here, nowhere else.
// movePct: minimum % move vs last-published price (ratchet) to fire.
// roundStep: price step at which a round-number cross is newsworthy.
// ---------------------------------------------------------------------------
const CONFIG = {
  MCX_GOLD:   { movePct: 1.0,  roundStep: 5000,  label: "MCX Gold",    unit: "₹/10g",  category: "metals" },
  MCX_SILVER: { movePct: 2.0,  roundStep: 10000, label: "MCX Silver",  unit: "₹/kg",   category: "metals" },
  MCX_CRUDE:  { movePct: 1.5,  roundStep: 500,   label: "MCX Crude",   unit: "₹/bbl",  category: "energy" },
  MCX_COPPER: { movePct: 1.5,  roundStep: 50,    label: "MCX Copper",  unit: "₹/kg",   category: "metals" },
  MCX_NATGAS: { movePct: 2.5,  roundStep: 25,    label: "MCX Nat Gas", unit: "₹/mmBtu",category: "energy" },
  USDINR:     { movePct: 0.3,  roundStep: 0.5,   label: "USD/INR",     unit: "₹",      category: "forex"  },
};

// Cooldown: one flash per instrument per 75 min.
// A continuing move only re-fires once it extends by another full threshold step from
// the LAST FLASH's price (ratchet) — so a trending day gives 2-3 escalation posts, not 12.
const COOLDOWN_MIN = 75;

// Only one flash per run — the biggest trigger wins. Never spam a single cycle.
const MAX_FLASHES_PER_RUN = 1;

// ---------------------------------------------------------------------------

if (!fs.existsSync(SNAPSHOT_FILE)) {
  console.error(`Snapshot not found: ${SNAPSHOT_FILE} — run fetch-snapshot.mjs first`);
  process.exit(0);  // exit 0: don't fail the workflow, just skip
}

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
const state = fs.existsSync(STATE_FILE)
  ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
  : {};

const now = new Date(snapshot.generatedAt ?? new Date().toISOString());

function istString(d) {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
    hour12: true,
  }) + " IST";
}

// ISO date at IST midnight — used for the MDX date field
function istDateISO(d) {
  const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}T${String(ist.getHours()).padStart(2, "0")}:${String(ist.getMinutes()).padStart(2, "0")}:00.000Z`;
}

// ---------------------------------------------------------------------------
// 1. Trigger detection
// ---------------------------------------------------------------------------
const candidates = [];

for (const [key, cfg] of Object.entries(CONFIG)) {
  const inst = snapshot.instruments[key];
  if (!inst || inst.stale || !inst.price) continue;

  const st = state[key] ?? {};

  // Baseline is the last-published price for this instrument (the ratchet).
  // Falls back to prevClose so the very first flash of the session is anchored to
  // yesterday's close — never to a stale hardcoded value.
  const baseline = st.lastFlashPrice ?? inst.prevClose;
  if (!baseline) continue;

  const minsSince = st.lastFlashAt
    ? (now.getTime() - new Date(st.lastFlashAt).getTime()) / 60000
    : Infinity;

  const movePct = ((inst.price - baseline) / baseline) * 100;

  // T1: threshold move vs baseline
  if (Math.abs(movePct) >= cfg.movePct && minsSince >= COOLDOWN_MIN) {
    candidates.push({
      key, cfg, inst,
      type: "MOVE",
      // Score = multiples of threshold. Gold at 1.8% vs threshold 1.0% = score 1.8.
      // Ensures the most significant trigger wins when several fire simultaneously.
      score: Math.abs(movePct) / cfg.movePct,
      packet: {
        trigger:    "THRESHOLD_MOVE",
        instrument: cfg.label,
        from:       baseline,
        to:         inst.price,
        movePct:    +movePct.toFixed(2),
        window:     st.lastFlashAt
          ? `since last flash at ${istString(new Date(st.lastFlashAt))}`
          : "since previous close",
        unit: cfg.unit,
      },
    });
    continue;  // a MOVE flash will mention the level anyway; don't double-fire T2
  }

  // T2: round-number cross (which bucket does the price sit in?)
  const bucket     = Math.floor(inst.price  / cfg.roundStep);
  const lastBucket = st.lastRoundBucket ?? Math.floor(baseline / cfg.roundStep);
  if (bucket !== lastBucket && minsSince >= COOLDOWN_MIN) {
    const level = (bucket > lastBucket ? bucket : lastBucket) * cfg.roundStep;
    candidates.push({
      key, cfg, inst,
      type: "LEVEL",
      score: 0.9,  // moves outrank level crosses when both fire in the same cycle
      packet: {
        trigger:    "ROUND_LEVEL_CROSS",
        instrument: cfg.label,
        direction:  bucket > lastBucket ? "above" : "below",
        level,
        price:      inst.price,
        unit:       cfg.unit,
      },
    });
  }
}

if (candidates.length === 0) {
  console.log(`No triggers at ${istString(now)} — feed stays quiet. (correct behavior)`);

  // Still update round-number buckets so T2 doesn't fire late on stale data
  let stateChanged = false;
  for (const [key, cfg] of Object.entries(CONFIG)) {
    const inst = snapshot.instruments[key];
    if (!inst || !inst.price) continue;
    const bucket = Math.floor(inst.price / cfg.roundStep);
    if ((state[key]?.lastRoundBucket) !== bucket) {
      state[key] = { ...(state[key] ?? {}), lastRoundBucket: bucket };
      stateChanged = true;
    }
  }
  if (stateChanged) fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  process.exit(0);
}

// Biggest trigger wins
candidates.sort((a, b) => b.score - a.score);
const winners = candidates.slice(0, MAX_FLASHES_PER_RUN);

console.log(`Triggers: [${candidates.map(c => `${c.key}(${c.type} score=${c.score.toFixed(2)})`).join(", ")}]`);
console.log(`Processing winner: ${winners[0].key}`);

// ---------------------------------------------------------------------------
// 2. Generation — snapshot + trigger packet + last 3 flashes (anti-contradiction)
// ---------------------------------------------------------------------------
async function generateFlash(cand) {
  const st = state[cand.key] ?? {};
  const recent = (st.recentFlashes ?? []).slice(-3);  // [{at, title, price}]

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system:
        "You write flash market intelligence for BhaavBrief, an Indian MCX commodity feed. " +
        "Rules:\n" +
        "1. Use ONLY numbers given to you — never recall prices from memory or training data.\n" +
        "2. 60-120 word body. State instrument, magnitude, and the mechanical driver " +
        "(rupee move, COMEX move, level break, volume signal).\n" +
        "3. End body with one 'Watch:' line naming the next specific ₹ level to monitor.\n" +
        "4. Never use 'record', 'lifetime high', 'all-time' — you cannot verify them.\n" +
        "5. Never give advice or use 'time to buy', 'should you buy', or similar.\n" +
        "6. Do not contradict the recent flashes provided — if this move extends or reverses " +
        "one, say so explicitly.\n" +
        "7. No hashtags. No em-dashes at the start of sentences. Plain, precise prose.\n" +
        "8. IST timestamps when referencing 'earlier', 'this morning', etc.\n" +
        'Respond ONLY with JSON: {"title": string, "body": string, "tags": string[]}. ' +
        "No markdown fences, no explanation.",
      messages: [
        {
          role: "user",
          content:
            `Time now: ${istString(now)}\n\n` +
            `TRIGGER PACKET (this is what happened — build the flash from this):\n` +
            `${JSON.stringify(cand.packet, null, 2)}\n\n` +
            `FULL MARKET SNAPSHOT (cross-asset context — use for rupee/COMEX linkage):\n` +
            `${JSON.stringify(snapshot.instruments)}\n\n` +
            `RECENT FLASHES for ${cand.cfg.label} (do not contradict; acknowledge if this ` +
            `move extends or reverses one of these):\n` +
            `${JSON.stringify(recent)}\n\n` +
            `Generate the flash now.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// 3. Validate — same philosophy as validate-brief.mjs, inline mini-gate
// ---------------------------------------------------------------------------
function validateFlash(flash, cand) {
  const issues = [];
  const text = `${flash.title}\n${flash.body}`;

  // Every ₹/$ number must be near a known price, move amount, or round level.
  const moveAmount = Math.abs((cand.packet.to ?? 0) - (cand.packet.from ?? 0));
  const validNumbers = [
    ...Object.values(snapshot.instruments).flatMap((i) => [i.price, i.prevClose]),
    cand.packet.from,
    cand.packet.to,
    cand.packet.level,
    cand.packet.price,
    moveAmount,  // e.g. ₹3,070 drop in gold — derivable arithmetic, not hallucination
  ].filter((v) => typeof v === "number" && v > 0);

  for (const m of text.matchAll(/(?:₹|Rs\.?\s?|\$)\s?([\d,]+(?:\.\d+)?)/g)) {
    const val = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isFinite(val) || val < 50) continue;
    const near = validNumbers.some((v) => Math.abs(val - v) / v <= 0.02);
    const roundLevel = val >= 1000 && val % 500 === 0;
    if (!near && !roundLevel) {
      issues.push(`number ${m[0]} not in snapshot/packet (±2%)`);
    }
  }

  if (/record|lifetime|all-time/i.test(text))
    issues.push("unverifiable superlative (record/lifetime/all-time)");

  if (/time to (buy|invest)|should you|we recommend/i.test(text))
    issues.push("advice phrasing");

  return issues;
}

// ---------------------------------------------------------------------------
// 4. Write MDX + update state
// ---------------------------------------------------------------------------
fs.mkdirSync(FLASH_DIR, { recursive: true });
let published = 0;

for (const cand of winners) {
  let flash;
  try {
    flash = await generateFlash(cand);
  } catch (e) {
    console.error(`Generation failed for ${cand.key}: ${e.message}`);
    console.error("State untouched — will retry next cycle.");
    continue;
  }

  const issues = validateFlash(flash, cand);
  if (issues.length) {
    console.error(`BLOCKED flash for ${cand.key}:`);
    issues.forEach((i) => console.error(`  - ${i}`));
    console.error("State untouched — will retry next cycle.");
    continue;
  }

  // Slug: deterministic from ISO timestamp + title (no Claude-generated date fragments)
  const iso = now.toISOString();
  const timeTag = iso.slice(11, 16).replace(":", "");
  const titleSlug = flash.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const id = `${iso.slice(0, 10)}-${timeTag}-${titleSlug}`;

  // Write as MDX so lib/flash.ts can read it without any changes
  const mdx = `---
title: "${flash.title.replace(/"/g, '\\"')}"
date: "${istDateISO(now)}"
source: "BhaavBrief Flash Monitor"
category: "${cand.cfg.category}"
published: true
trigger: "${cand.packet.trigger}"
instrumentKey: "${cand.key}"
---

${flash.body}
`;

  const filepath = path.join(FLASH_DIR, `${id}.mdx`);
  if (fs.existsSync(filepath)) {
    console.warn(`Flash file already exists: ${id}.mdx — skipping`);
    continue;
  }
  fs.writeFileSync(filepath, mdx, "utf8");

  // Update ratchet state — next flash for this instrument measures from this price
  state[cand.key] = {
    lastFlashAt:    iso,
    lastFlashPrice: cand.inst.price,
    lastRoundBucket: Math.floor(cand.inst.price / cand.cfg.roundStep),
    recentFlashes: [
      ...((state[cand.key]?.recentFlashes) ?? []).slice(-2),
      { at: istString(now), title: flash.title, price: cand.inst.price },
    ],
  };

  published++;
  console.log(`PUBLISHED: ${flash.title}`);
  console.log(`  File: content/flash/${id}.mdx`);
  console.log(`  Tags: ${(flash.tags ?? []).join(", ")}`);
}

// Also update round-number buckets for instruments that didn't trigger,
// so we don't fire a stale T2 on the next cycle
for (const [key, cfg] of Object.entries(CONFIG)) {
  const inst = snapshot.instruments[key];
  if (!inst || !inst.price) continue;
  if (!state[key]) state[key] = {};
  state[key].lastRoundBucket = Math.floor(inst.price / cfg.roundStep);
}

fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

if (published) {
  console.log(`\n${published} flash(es) written.`);
} else if (candidates.length) {
  console.log("Triggers detected but blocked by validator — will retry next cycle.");
} else {
  console.log("No triggers — feed stays quiet.");
}
process.exit(0);
