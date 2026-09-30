// Small, pure display-formatting helpers shared between components/mcx/OptionChain.tsx,
// components/mcx/StrategyBuilder.tsx and components/CountdownTimer.tsx. No server-only
// dependencies — safe to import from client components.

export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'due now'
  const totalMin = Math.floor(ms / 60000)
  const days  = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins  = totalMin % 60

  if (days > 0)  return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function formatIST(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }) + ' IST'
}

// "As of" label for data that may be carried forward from an earlier session:
// time only when the timestamp is from today (IST), otherwise date + time —
// a days-old cached option chain used to read "As of 23:25 IST" as if current.
export function formatAsOfIST(iso: string, now: Date = new Date()): string {
  const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
  const when = new Date(iso)
  if (istDay(when) === istDay(now)) {
    return when.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST'
  }
  return formatIST(iso)
}
