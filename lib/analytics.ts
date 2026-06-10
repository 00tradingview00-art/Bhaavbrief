// lib/analytics.ts — GA4 event helpers for BhaavBrief
// Fixes: "Key events — No data available". Until this exists you cannot
// connect traffic to subscriptions, which makes every other GA number noise.
//
// Setup (one-time, ~20 min):
// 1. Drop trackEvent below into lib/, call trackSubscribe() in the form handler.
// 2. GA4 Admin → Events → wait for `subscribe` to appear (or create it manually)
//    → toggle "Mark as key event".
// 3. GA4 Admin → Data settings → Data filters → create an "Internal traffic"
//    filter for your own IP, and activate it. Right now you ARE the traffic;
//    filtering yourself out is the difference between data and a mirror.

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: GtagParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

/** Fire ONLY after Brevo confirms the subscription succeeded — never on click.
 *  Tracking form clicks instead of confirmed subscribes inflates the number
 *  and hides Brevo failures. */
export function trackSubscribe(source: string) {
  trackEvent("subscribe", {
    method: "brevo",
    source, // "hero" | "footer" | "brief_page" | "about" — tells you WHICH CTA earns its place
  });
}

/** Optional but cheap and high-signal: fires when someone finishes a brief.
 *  Returning readers who scroll to the end are your future subscribers —
 *  this tells you how many near-converts you have. */
export function trackBriefReadComplete(edition: string) {
  trackEvent("brief_read_complete", { edition });
}

// ---------------------------------------------------------------------------
// Wiring into the subscribe form handler:
// ---------------------------------------------------------------------------
//
// import { trackSubscribe } from "@/lib/analytics";
//
// async function handleSubscribe(email: string, source: string) {
//   setStatus("loading");
//   const res = await fetch("/api/subscribe", {
//     method: "POST",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify({ email }),
//   });
//   if (res.ok) {
//     trackSubscribe(source);          // <-- after confirmed success only
//     setStatus("done");
//   } else {
//     trackEvent("subscribe_error", { source, status: res.status });
//     setStatus("error");              // also tells you if Brevo is silently failing
//   }
// }
//
// ---------------------------------------------------------------------------
// Scroll-completion wiring (brief page, optional):
// ---------------------------------------------------------------------------
//
// useEffect(() => {
//   const el = document.getElementById("brief-end"); // empty div after last section
//   if (!el) return;
//   const seen = { current: false };
//   const obs = new IntersectionObserver(([entry]) => {
//     if (entry.isIntersecting && !seen.current) {
//       seen.current = true;
//       trackBriefReadComplete(edition);
//       obs.disconnect();
//     }
//   });
//   obs.observe(el);
//   return () => obs.disconnect();
// }, [edition]);
