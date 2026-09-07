import { describe, test, expect } from "vitest";
import { charAlignmentToWords, chunkWords, activeChunkForTime, activeChunkForFrame } from "./reelCaptions.mjs";

// "Hi there" with a space at index 2 — one plausible ElevenLabs alignment shape.
function fixtureAlignment() {
  const chars = ["H", "i", " ", "t", "h", "e", "r", "e"];
  const starts = [0.00, 0.10, 0.20, 0.25, 0.35, 0.45, 0.55, 0.65];
  const ends   = [0.10, 0.20, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75];
  return { characters: chars, character_start_times_seconds: starts, character_end_times_seconds: ends };
}

describe("charAlignmentToWords", () => {
  test("groups characters into words on whitespace", () => {
    const words = charAlignmentToWords(fixtureAlignment());
    expect(words).toEqual([
      { text: "Hi", start: 0.00, end: 0.20 },
      { text: "there", start: 0.25, end: 0.75 },
    ]);
  });

  test("handles a single word with no whitespace", () => {
    const alignment = {
      characters: ["O", "k"],
      character_start_times_seconds: [0, 0.1],
      character_end_times_seconds: [0.1, 0.2],
    };
    expect(charAlignmentToWords(alignment)).toEqual([{ text: "Ok", start: 0, end: 0.2 }]);
  });

  test("returns [] for missing or malformed alignment", () => {
    expect(charAlignmentToWords(null)).toEqual([]);
    expect(charAlignmentToWords(undefined)).toEqual([]);
    expect(charAlignmentToWords({})).toEqual([]);
    expect(charAlignmentToWords({ characters: ["a"], character_start_times_seconds: [0] })).toEqual([]);
  });

  test("returns [] when array lengths disagree (malformed response, don't guess)", () => {
    const alignment = {
      characters: ["a", "b"],
      character_start_times_seconds: [0],
      character_end_times_seconds: [0.1, 0.2],
    };
    expect(charAlignmentToWords(alignment)).toEqual([]);
  });

  test("trailing whitespace doesn't produce a trailing empty word", () => {
    const alignment = {
      characters: ["H", "i", " "],
      character_start_times_seconds: [0, 0.1, 0.2],
      character_end_times_seconds: [0.1, 0.2, 0.25],
    };
    expect(charAlignmentToWords(alignment)).toEqual([{ text: "Hi", start: 0, end: 0.2 }]);
  });
});

describe("chunkWords", () => {
  const words = [
    { text: "Gold", start: 0.0, end: 0.3 },
    { text: "rose", start: 0.3, end: 0.6 },
    { text: "today", start: 0.6, end: 1.0 },
    { text: "sharply", start: 1.0, end: 1.5 },
  ];

  test("groups into chunks of the given size, spanning each chunk's own start/end", () => {
    expect(chunkWords(words, 2)).toEqual([
      { text: "Gold rose", start: 0.0, end: 0.6 },
      { text: "today sharply", start: 0.6, end: 1.5 },
    ]);
  });

  test("a trailing partial chunk is kept, not dropped", () => {
    expect(chunkWords(words, 3)).toEqual([
      { text: "Gold rose today", start: 0.0, end: 1.0 },
      { text: "sharply", start: 1.0, end: 1.5 },
    ]);
  });

  test("returns [] for empty input", () => {
    expect(chunkWords([], 3)).toEqual([]);
  });

  test("wordsPerChunk < 1 is treated as 1, not an infinite loop", () => {
    expect(chunkWords(words, 0).length).toBe(4);
  });
});

describe("activeChunkForTime / activeChunkForFrame", () => {
  const chunks = [
    { text: "Gold rose", start: 0.0, end: 0.6 },
    { text: "today sharply", start: 0.6, end: 1.5 },
  ];

  test("finds the chunk covering a given time", () => {
    expect(activeChunkForTime(chunks, 0.2)).toEqual(chunks[0]);
    expect(activeChunkForTime(chunks, 1.0)).toEqual(chunks[1]);
  });

  test("start boundary is inclusive, end boundary is exclusive", () => {
    expect(activeChunkForTime(chunks, 0.6)).toEqual(chunks[1]);
  });

  test("returns null before the first chunk or after the last", () => {
    expect(activeChunkForTime(chunks, -0.1)).toBeNull();
    expect(activeChunkForTime(chunks, 1.5)).toBeNull();
    expect(activeChunkForTime(chunks, 5)).toBeNull();
  });

  test("returns null for non-array input", () => {
    expect(activeChunkForTime(null, 0.2)).toBeNull();
  });

  test("activeChunkForFrame converts frame+fps to seconds correctly", () => {
    // frame 18 at 30fps = 0.6s -> second chunk
    expect(activeChunkForFrame(chunks, 18, 30)).toEqual(chunks[1]);
    // frame 6 at 30fps = 0.2s -> first chunk
    expect(activeChunkForFrame(chunks, 6, 30)).toEqual(chunks[0]);
  });
});
