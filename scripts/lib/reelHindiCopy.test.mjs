import { describe, test, expect } from "vitest";
import { parseHindiCopyResponse } from "./reelHindiCopy.mjs";

const ENGLISH = {
  hook_caption: "EN hook", stat_line: "EN stat", beat1: "EN beat1", beat2: "EN beat2",
  beat3: "EN beat3", payoff: "EN payoff", voiceover: "EN voiceover",
};

const VALID_HINDI = {
  hook_caption: "हिंदी हुक", stat_line: "हिंदी आंकड़ा", beat1: "हिंदी बीट 1", beat2: "हिंदी बीट 2",
  beat3: "हिंदी बीट 3", payoff: "हिंदी पेऑफ", voiceover: "हिंदी वॉइसओवर। BhaavBrief.",
};

describe("parseHindiCopyResponse", () => {
  test("valid JSON passthrough — all 7 fields used as-is", () => {
    const result = parseHindiCopyResponse(JSON.stringify(VALID_HINDI), ENGLISH);
    expect(result).toEqual(VALID_HINDI);
  });

  test("JSON wrapped in prose is extracted", () => {
    const raw = `Here is the translation:\n${JSON.stringify(VALID_HINDI)}\nHope that helps!`;
    expect(parseHindiCopyResponse(raw, ENGLISH)).toEqual(VALID_HINDI);
  });

  test("missing field falls back to English for just that field", () => {
    const partial = { ...VALID_HINDI };
    delete partial.beat2;
    const result = parseHindiCopyResponse(JSON.stringify(partial), ENGLISH);
    expect(result.beat2).toBe("EN beat2");
    expect(result.hook_caption).toBe(VALID_HINDI.hook_caption);
  });

  test("empty-string field falls back to English for just that field", () => {
    const partial = { ...VALID_HINDI, payoff: "   " };
    const result = parseHindiCopyResponse(JSON.stringify(partial), ENGLISH);
    expect(result.payoff).toBe("EN payoff");
  });

  test("non-string field falls back to English", () => {
    const partial = { ...VALID_HINDI, stat_line: 42 };
    const result = parseHindiCopyResponse(JSON.stringify(partial), ENGLISH);
    expect(result.stat_line).toBe("EN stat");
  });

  test("completely unparseable response falls back to English for every field", () => {
    const result = parseHindiCopyResponse("not json at all", ENGLISH);
    expect(result).toEqual({
      hook_caption: "EN hook", stat_line: "EN stat", beat1: "EN beat1", beat2: "EN beat2",
      beat3: "EN beat3", payoff: "EN payoff", voiceover: "EN voiceover",
    });
  });

  test("output never carries extra fields beyond the known 7", () => {
    const result = parseHindiCopyResponse(JSON.stringify({ ...VALID_HINDI, extra: "junk" }), ENGLISH);
    expect(Object.keys(result).sort()).toEqual(
      ["beat1", "beat2", "beat3", "hook_caption", "payoff", "stat_line", "voiceover"].sort()
    );
  });
});
