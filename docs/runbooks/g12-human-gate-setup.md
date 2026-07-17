# G-12 human-approval gate — one-time setup

The gate is code-complete (`scripts/apply-human-gate.mjs`, `scripts/lib/gateStreak.mjs`,
`scripts/lib/telegram.mjs`, `.github/workflows/approve-edition.yml`) but **dormant** — it
does nothing and the pipeline auto-publishes exactly as it does today — until both
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` repo secrets exist. This is deliberate: without
a working notification channel, a staged (`published: false`) brief would sit hidden with
nobody able to approve it, silently breaking the daily publish. Verified: with either secret
absent, `apply-human-gate.mjs` exits 0 immediately and leaves the brief file untouched (see
its own test run in the commit that introduced it).

## Steps

1. **Create a Telegram bot.** Message [@BotFather](https://t.me/BotFather) on Telegram,
   send `/newbot`, follow the prompts. You get a bot token
   (`123456789:ABC-...`) — this is `TELEGRAM_BOT_TOKEN`.
2. **Get your chat ID.** Message your new bot anything (e.g. "hi"), then visit
   `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser — the response JSON
   contains `"chat":{"id": ...}`. That number is `TELEGRAM_CHAT_ID`.
3. **Add both as repo secrets** — GitHub repo → Settings → Secrets and variables →
   Actions → New repository secret. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
4. **Verify with a real run.** Trigger `generate-brief.yml` manually
   (`gh workflow run generate-brief.yml`) or wait for the next scheduled run. You should
   receive a Telegram message within a few minutes of the brief generating, and
   `content/briefs/edition-NNN.mdx` should show `published: false` in its diff.

## How to approve a staged edition

The Telegram message includes the exact command:

```
gh workflow run approve-edition.yml -f edition=<N> --repo <owner>/<repo>
```

Run it (needs `gh` CLI authenticated against the repo, or trigger the same workflow
from the GitHub Actions UI with the edition number as input). This flips
`published: false` → `published: true` and commits — the site picks it up on the next
Vercel deploy, same as any other commit to `main`.

**Target: under 3 minutes of your morning**, per the master doc's own SLO for this step.

## Graduating out of the human gate

`scripts/lib/gateStreak.mjs` tracks consecutive **clean** gate passes (zero issues at
all — a warning-level issue resets the streak, not just a blocking one) in
`data/gate-streak.json`. Once 30 consecutive clean passes accumulate, the gate
auto-publishes without staging or a Telegram ping, regardless of whether the secrets are
still configured. Check `data/gate-streak.json` at any time to see progress; a single
dirty pass resets the counter to zero, by design — the streak isn't "how long has it
been," it's "how many in a row without incident."

## If something goes wrong

- **No Telegram message arrived but the brief still published as `published: true`
  immediately** — the gate wasn't active for that run (secrets not set, or the streak
  had already crossed the auto-publish threshold). Check `data/gate-streak.json`.
- **A brief is stuck at `published: false` with no way to approve it** — run
  `gh workflow run approve-edition.yml -f edition=<N>` directly; you don't need to wait
  for or rely on the Telegram message itself, it's a convenience notification, not the
  only approval path.
- **`apply-human-gate.mjs` step failed (not just "stayed dormant")** — this is a genuine
  script crash, not "correctly rejected content," and should have triggered the
  workflow's failure-alert path same as any other infra failure.
