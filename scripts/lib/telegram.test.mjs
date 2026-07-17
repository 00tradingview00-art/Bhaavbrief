import { describe, test, expect } from "vitest";
import { formatApprovalMessage } from "./telegram.mjs";

describe("formatApprovalMessage", () => {
  test("clean pass shows a checkmark, no warnings line noise", () => {
    const msg = formatApprovalMessage({
      edition: 68, title: "Gold Breaks $4,000", edgeText: "COMEX Gold above 4000", warnings: [], repo: "org/repo",
    });
    expect(msg).toContain("#68");
    expect(msg).toContain("✓ Clean pass");
    expect(msg).toContain("gh workflow run approve-edition.yml -f edition=68");
  });

  test("warnings are surfaced by count and content", () => {
    const msg = formatApprovalMessage({
      edition: 69, title: "Silver Slides", edgeText: null, warnings: ["PARITY-WARN: gap"], repo: "org/repo",
    });
    expect(msg).toContain("1 warning(s)");
    expect(msg).toContain("PARITY-WARN: gap");
    expect(msg).not.toContain("Edge:");
  });
});
