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

// FIX-12 (D-16): the master doc's own event names — GA showed ~10% returning
// users on a daily product with no instrumentation to explain why. These
// were previously just documented in this file's comments below, never
// actually called from any component.

/** Fires when the retention modal (components/EmailCaptureModal.tsx) becomes
 *  visible — pairs with trackSubscribeCompleted to compute the modal's own
 *  conversion rate, not just top-of-funnel subscribe volume. */
export function trackSubscribeShown(source: string) {
  trackEvent("subscribe_shown", { source });
}

/** Fires alongside the existing trackSubscribe("subscribe") call — kept as a
 *  second, exactly-named event because the master doc specifies
 *  "subscribe_completed" and existing GA4 configuration may already depend
 *  on the "subscribe" event name elsewhere; this doesn't replace it. */
export function trackSubscribeCompleted(source: string) {
  trackEvent("subscribe_completed", { source });
}

/** Per-section scroll depth on a brief — which sections actually earn the
 *  read, not just whether someone reached the bottom. */
export function trackSectionSeen(edition: string, section: string) {
  trackEvent("brief_section_seen", { edition, section });
}

/** Fire ONLY once /api/cashfree/poll-status first reports isPro:true for a
 *  merchantSubId — that's the client's proof the Cashfree webhook already
 *  activated the subscription server-side. Never fire on the /pro?paid=1
 *  redirect alone; that fires even on abandoned/failed checkouts.
 *  merchantSubId doubles as the sessionStorage guard key and the GA4
 *  transaction_id, so a reload of the success page (or the checkout page's
 *  own fallback poll also detecting activation) can't double-count. */
export function trackProPurchase(plan: string, value: number, merchantSubId: string) {
  if (typeof window === "undefined") return;
  const guardKey = `ga_purchase_fired:${merchantSubId}`;
  if (sessionStorage.getItem(guardKey)) return;
  sessionStorage.setItem(guardKey, "1");
  trackEvent("purchase", { currency: "INR", value, transaction_id: merchantSubId, plan });
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
