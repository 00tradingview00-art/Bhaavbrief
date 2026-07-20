import { describe, test, expect } from "vitest";
import { classifySemanticIssue, isSelfContradicted } from "./semanticDemote.mjs";

describe("classifySemanticIssue — regression tests for missed self-contradiction phrasings", () => {
  // Each of these is a real detail string returned by the semantic checker
  // on 2026-07-20, where severity:"block" blocked publication of an
  // otherwise-clean brief three runs in a row because the old exact-substring
  // list didn't recognize the checker's own "no issue" conclusion.
  const realNonIssueDetails = [
    "Brent crude price contradiction: ... The statement 'the first time it has cleared that level in this rally' is a historical claim that cannot be verified against today's snapshot alone and is acceptable. No block applies here upon re-reading.",
    "USDINR direction contradiction: snapshot shows USDINR at ₹96.27 with changePct -0.3954%... 'firmed' correctly describes appreciation, and -0.40% matches -0.3954% (rounded to -0.40%). This is consistent, no block.",
    "Gold price contradiction in headline vs body: Headline states 'MCX Gold ₹141069' matching snapshot price... Snapshot changePct = ... which rounds to 0.06%. NO BLOCK — this is consistent.",
    "Crude percentage check: Snapshot shows MCX_CRUDE price 8149... Verification: ... rounds to 0.57%. NO BLOCK — consistent.",
  ];

  test.each(realNonIssueDetails)("detects self-contradiction: %s", (detail) => {
    expect(isSelfContradicted(detail)).toBe(true);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-WARN");
  });

  test("a genuine block (no self-contradiction language) stays SEMANTIC-BLOCK", () => {
    const detail =
      "Headline states 'Brent crude crossed $95.10 overnight' but the Price Bridge table shows Brent at $90.37 — these are two different current-session prices for the same instrument with no support/resistance label on either.";
    expect(isSelfContradicted(detail)).toBe(false);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-BLOCK");
  });

  test("checker-reported warn severity is never promoted to block", () => {
    expect(classifySemanticIssue("warn", "A specific rupee figure looks off.")).toBe("SEMANTIC-WARN");
  });
});
