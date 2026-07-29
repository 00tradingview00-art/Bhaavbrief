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

describe("classifySemanticIssue — regression tests for 2026-07-27 to 2026-07-29 phrasings", () => {
  // Real detail strings from three separate blocked generate-brief.yml runs
  // this week (digits approximated where CI log redaction obscured them —
  // the fix only needs the qualitative phrasing to match).
  const realNonIssueDetails = [
    "Silver price contradiction: Brief states 'Silver dropped -1.69%' ... but then later says 'Silver dropped -1.69% while gold fell only -0.75%' — these are consistent. However, the brief also states silver 'fell ₹3,739 from its previous close' but MCX_SILVER shows prevClose 221173 and price 217434, which is a difference of ₹3,739. Verification: 221173 - 217434 = 3739. This checks out. However, the brief references 'near-₹9,024 peak' for crude oil ... this is acceptable as a multi-session reference.",
    "WTI crude price change contradicts snapshot data. Brief states 'WTI crude up $3.86 to $82.58' but snapshot shows prevClose $79.16 and current $82.58, which is a change of $3.86. The $3.86 move is correct per snapshot (79.16→82.58). ... The brief conflates intraday floor language with session open/close moves without clarity.",
  ];

  test.each(realNonIssueDetails)("detects self-contradiction: %s", (detail) => {
    expect(isSelfContradicted(detail)).toBe(true);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-WARN");
  });

  test("a genuine two-number block that also asks the writer to 'clarify' stays SEMANTIC-BLOCK", () => {
    const detail =
      "Brief states gold at ₹141,900 in the headline and ₹138,200 in the body — these cannot both be today's close; clarify which is correct.";
    expect(isSelfContradicted(detail)).toBe(false);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-BLOCK");
  });
});
