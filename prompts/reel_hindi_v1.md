<!--
prompts/reel_hindi_v1.md — versioned prompt for translating a generated
English reel's on-screen/spoken copy into Hindi, for generate-brief-reel.mjs's
generateHindiVariant(). Replaces two independent, drift-prone translation
calls (one for the full voiceover, one for just hook_caption/beat1/beat2 used
in the caption) with a single call translating all 7 fields together, so the
spoken Hindi and the written Hindi (on-screen text + Instagram caption) agree
in wording — the property the old two-call approach didn't guarantee.

v1 (2026-09-04): initial version, part of full Hindi visual localization —
translated text now also drives a second, independently-timed frame render
(previously the "Hindi reel" reused the English-rendered frames verbatim, so
every burned-in on-screen word stayed in English regardless of the audio
track).

Known, deliberate-for-now gap: copy.chart's two_bar/icon_array labels are not
in this schema and stay in English on the Hindi pass if a beat carries a
chart — small enough to leave for a follow-up.

{{PLACEHOLDER}} tokens are substituted by scripts/lib/promptTemplate.mjs's
renderPromptTemplate() — see generate-brief-reel.mjs's translateCopyToHindi().

Bump the filename (reel_hindi_v2.md, etc.) on any material change and update
PROMPT_VERSION in generate-brief-reel.mjs.
-->
Translate this BhaavBrief Instagram Reel's copy from English to Hindi (Devanagari script). This translation drives BOTH the spoken voiceover AND the burned-in on-screen text for the same reel — every field must read as natural spoken Hindi when read aloud, since it will be seen and heard together.

Keep in English, untranslated, wherever they appear: numbers, rupee amounts, percentages, commodity/instrument names (MCX Gold, MCX Silver, MCX Crude, MCX Copper, COMEX, WTI), institution names (OPEC, Federal Reserve, RBI, USDINR), and the closing word "BhaavBrief." in the voiceover — say it in English like a signature, not translated.

Translate the connecting narrative, framing, and everyday-impact language into natural, conversational Hindi — not a stiff literal translation. Keep each field's meaning and emphasis matched to the English original; do not add or drop information.

English hook_caption: "{{HOOK_CAPTION}}"
English stat_line: "{{STAT_LINE}}"
English beat1: "{{BEAT1}}"
English beat2: "{{BEAT2}}"
English beat3: "{{BEAT3}}"
English payoff: "{{PAYOFF}}"
English voiceover: "{{VOICEOVER}}"

Return ONLY this JSON:
{
  "hook_caption": "Hindi translation of hook_caption. Same length/impact as the English — this is the on-screen hook text.",
  "stat_line": "Hindi translation of stat_line.",
  "beat1": "Hindi translation of beat1.",
  "beat2": "Hindi translation of beat2.",
  "beat3": "Hindi translation of beat3.",
  "payoff": "Hindi translation of payoff.",
  "voiceover": "Hindi translation of the full voiceover, natural spoken rhythm, ending with 'BhaavBrief.' in English as the signature pause."
}
