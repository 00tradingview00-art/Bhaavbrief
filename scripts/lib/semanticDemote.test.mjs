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

describe("classifySemanticIssue — regression tests for the checkmark-verified 'conflates/ambiguity' variant", () => {
  // Same session, same day (2026-07-29) — Haiku verified every individual
  // number with its own ✓ checkmarks, then blocked on how the numbers were
  // presented rather than on any actual mismatch.
  const realNonIssueDetails = [
    "WTI crude price change contradicts stated move. Snapshot shows WTI prevClose $79.16, current price $82.19, changePct +3.849% (rounds to +3.85%). Brief states 'WTI crude up $3.03 to $82.19' — but $79.16 + $3.03 = $82.19 ✓. However, brief also states crude moved up '$3.03' and separately 'crude absorbing the risk premium...crude +3.49%' — the +3.49% refers to MCX crude (snapshot: 3.4855%), not WTI. The text conflates WTI's +3.85% move with MCX's +3.49% move without distinction in the macro thread.",
    "Crude price movement quantification inconsistency. Brief states 'The fact that crude is up ₹265 while gold is down ₹308' — MCX crude: prevClose ₹7603, current ₹7868, difference = ₹265 ✓. MCX gold: prevClose ₹141623, current ₹141315, difference = ₹308 ✓. However, the text then states 'crude +3.49% surge' and 'gold -0.2%' which are correct, but earlier states 'WTI crude up $3.03 to $82.19' — mixing WTI dollar moves with MCX rupee analysis in the same narrative without clear separation creates ambiguity about which market's move is being discussed.",
  ];

  test.each(realNonIssueDetails)("detects self-contradiction: %s", (detail) => {
    expect(isSelfContradicted(detail)).toBe(true);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-WARN");
  });
});

describe("classifySemanticIssue — regression tests for bare '✓ Consistent.' terminal verdicts", () => {
  // Same day, a single run returned 6 blocking issues, each just a claim plus
  // arithmetic plus a bare "✓ Consistent." with no complaint stated at all.
  const realNonIssueDetails = [
    "MCX Gold stated as 'down ₹197' in body ('MCX Gold at ₹141,406 is off ₹197'). Snapshot shows current 141406, prevClose 141603, difference = -197 ✓. Consistent.",
    "MCX Silver stated as 'up ₹1,338' in body ('MCX Silver at ₹217,178, up ₹1,338'). Snapshot shows current 217178, prevClose 215840, difference = +1338 ✓. Consistent.",
    "Brent Crude price movements: body states 'Brent up $3.17 to $87.26'. Snapshot shows current 87.26, prevClose 84.09, difference = +3.17 ✓. Consistent.",
  ];

  test.each(realNonIssueDetails)("detects self-contradiction: %s", (detail) => {
    expect(isSelfContradicted(detail)).toBe(true);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-WARN");
  });

  test("a genuine block ending in '...is NOT correct.' style negation stays SEMANTIC-BLOCK", () => {
    const detail =
      "Brief states MCX Gold fell ₹500 to ₹141,000, but snapshot prevClose is ₹141,623 and current price is ₹141,406 — a ₹217 move, not ₹500. The stated figure is not correct.";
    expect(isSelfContradicted(detail)).toBe(false);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-BLOCK");
  });
});

describe("classifySemanticIssue — regression test for the 2026-07-31 'not a factual contradiction / No issue.' phrasing", () => {
  // Real detail string from a blocked generate-brief.yml run (edition #76,
  // 2026-07-31) — Haiku verified both percentages independently, called the
  // comparison "valid analysis," explicitly said it was not a contradiction,
  // and still returned severity:"block". "not a contradiction" missed because
  // the qualifier "factual" sits between "a" and "contradiction"; the bare
  // "No issue." close matched no existing pattern.
  const realNonIssueDetail =
    "MCX Crude percentage calculation vs stated move: brief states MCX crude 'is down -2.03%' and snapshot changePct = -2.0281, rounding to -2.03% (correct). Brief also states 'tracking WTI's -1.39% slide with additional amplification' — WTI snapshot changePct = -1.3877, rounding to -1.39% (correct). The concept of 'additional amplification' (-2.03% vs -1.39%) is valid analysis and not a factual contradiction. No issue.";

  test("detects self-contradiction and demotes to warn", () => {
    expect(isSelfContradicted(realNonIssueDetail)).toBe(true);
    expect(classifySemanticIssue("block", realNonIssueDetail)).toBe("SEMANTIC-WARN");
  });

  test("a genuine block that happens to contain 'contradiction' elsewhere still blocks", () => {
    const detail =
      "Headline states gold at ₹141,900 but the body says ₹138,200 — this is a genuine contradiction between two current-session prices with no support/resistance label on either.";
    expect(isSelfContradicted(detail)).toBe(false);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-BLOCK");
  });
});

describe("classifySemanticIssue — regression test for the 2026-08-14 unguarded 'pass'/'consistent' terminal patterns", () => {
  // The bare terminal "pass."/"consistent." patterns above had no negation
  // guard, so a genuine contradiction the checker phrased as "...do not
  // pass." or "...are not consistent." was misread as the checker's own
  // "no issue" conclusion and silently demoted from block to warn.
  test("a genuine block ending in 'do not pass.' stays SEMANTIC-BLOCK", () => {
    const detail =
      "MCX gold's stated move and the snapshot figure do not pass verification: brief says down ₹500, snapshot shows a ₹217 move. These do not pass.";
    expect(isSelfContradicted(detail)).toBe(false);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-BLOCK");
  });

  test("a genuine block ending in 'are not consistent.' stays SEMANTIC-BLOCK", () => {
    const detail =
      "Headline states silver up 1.2% while the body states silver down 0.8% — these are not consistent.";
    expect(isSelfContradicted(detail)).toBe(false);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-BLOCK");
  });

  test("a genuine block ending in \"aren't consistent.\" stays SEMANTIC-BLOCK", () => {
    const detail =
      "The headline figure and the body figure aren't consistent.";
    expect(isSelfContradicted(detail)).toBe(false);
    expect(classifySemanticIssue("block", detail)).toBe("SEMANTIC-BLOCK");
  });

  test("the legitimate bare 'pass.'/'consistent.' non-issue phrasings still demote to warn", () => {
    expect(isSelfContradicted("Verification: 79.16 + 3.03 = 82.19. Pass.")).toBe(true);
    expect(isSelfContradicted("Snapshot values match the brief. Consistent.")).toBe(true);
  });
});

describe("classifySemanticIssue — structural numeric self-verification (valueA/valueB)", () => {
  // The proper fix, 2026-07-29: instead of chasing every new phrasing Haiku
  // invents for "these two numbers match," the checker now also emits the
  // two numbers it claims conflict, and we check them arithmetically here —
  // independent of whatever words appear in `detail`.
  test("exactly equal values demote to warn even with a neutral detail string", () => {
    expect(classifySemanticIssue("block", "some prose", 7857, 7857)).toBe("SEMANTIC-WARN");
  });

  test("values within tolerance (rounding) demote to warn", () => {
    expect(classifySemanticIssue("block", "some prose", 4034.3, 4034)).toBe("SEMANTIC-WARN");
  });

  test("a real chained-arithmetic defect (8089 vs actual 7851) stays SEMANTIC-BLOCK even with neutral prose", () => {
    expect(classifySemanticIssue("block", "some prose, no self-admission language", 8089, 7851)).toBe("SEMANTIC-BLOCK");
  });

  test("missing valueA/valueB falls back to the existing detail-text check", () => {
    expect(classifySemanticIssue("block", "a genuine two-price contradiction with no resolution")).toBe("SEMANTIC-BLOCK");
    expect(classifySemanticIssue("block", "checks out, no block")).toBe("SEMANTIC-WARN");
  });

  test("existing 2-argument call sites still work unchanged", () => {
    expect(classifySemanticIssue("warn", "anything")).toBe("SEMANTIC-WARN");
  });
});
