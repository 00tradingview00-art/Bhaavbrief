// Server-side error reporting (Next.js `onRequestError`).
//
// Why this file exists: `app/error.tsx` and `app/global-error.tsx` are client
// components, so they only ever `console.error` in the visitor's browser — and in
// production React redacts a server-render error down to an opaque `digest`
// before it reaches the client. The result was that server-render failures left
// no server-side trace at all.
//
// That gap was found on 2026-10-07: Vercel Observability reported `/options` at
// 15.3% and `/options/crude-oil` at 22.2% error rates (every other route 0%),
// but nothing in the logs said why, and the failure could not be reproduced
// locally. `onRequestError` runs on the server and receives the real error, so
// the next occurrence is diagnosable.
//
// `revalidateReason` is the field that matters most here: these two pages are ISR
// (`export const revalidate = 60`), so an error during a background regeneration
// means visitors keep getting the last good page (stale data), whereas an error
// with no revalidate reason means someone actually saw the error boundary. The
// two have very different severity and the metric alone cannot tell them apart.
//
// Observability only — this must never throw and never alters the response;
// Next calls it after the error has already been handled.

type RequestInfo = {
  path?: string
  method?: string
}

type ErrorContext = {
  routerKind?: string
  routePath?: string
  routeType?: string
  renderSource?: string
  revalidateReason?: string
}

export function onRequestError(
  error: unknown,
  request: RequestInfo,
  context: ErrorContext,
): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error(
      '[request-error]',
      JSON.stringify({
        path:             request?.path,
        method:           request?.method,
        routePath:        context?.routePath,
        routeType:        context?.routeType,
        renderSource:     context?.renderSource,
        // undefined here = not a background regeneration, i.e. a visitor saw this.
        revalidateReason: context?.revalidateReason,
        name:             err.name,
        message:          err.message,
      }),
      err.stack,
    )
  } catch {
    // A failure inside the reporter must never mask or escalate the original error.
  }
}
