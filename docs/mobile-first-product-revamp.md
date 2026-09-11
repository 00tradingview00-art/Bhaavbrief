# BhaavBrief mobile-first product revamp

## Objective

Deliver a complete mobile-first commodity intelligence experience without
inventing market facts or weakening the existing content, publication, or data
validation safeguards. The product must feel like a concise daily market
companion on a phone and retain deep analysis on larger screens.

## Audit findings

1. The current root route calls `getTerminalData`, correlation calculation,
   term-structure data, daily history and all brief data before it can render.
   This makes the home route a terminal, rather than an entry point.
2. The live root document is about 231 KB before JavaScript, fonts and later
   client-side requests. It also references multiple font files and route
   chunks. The largest practical performance win is fewer initial modules, not
   a visual-only CSS change.
3. The app already has real routes and verified data paths for market prices,
   options, event calendar, briefs, research, tools and account. The redesign
   will reuse those rather than introduce synthetic content or duplicate
   calculations.
4. The current mobile bottom navigation exposes eight destinations, while the
   compact product model needs five core actions. Full navigation remains
   available from the menu and page-level links.
5. Current styling is an editorial gold/paper system. The approved visual
   direction is a white, ink-navy and electric-blue intelligence system.

## Product architecture

### Mobile primary navigation

`Brief` → `/`
`Markets` → `/markets`
`Calendar` → `/calendar`
`Alerts` → `/alerts`
`Account` → `/account`

The menu retains Brief archive, Options, Research, Tools, Learn, search,
subscription and legal destinations.

### Root route: the Daily Brief

The root becomes a fast, server-rendered briefing surface:

1. market status and data timestamp;
2. today’s leading brief and short summary;
3. a five-instrument market watchlist;
4. the next high-impact event;
5. links to Markets, Calendar, Options and the full brief archive.

It does not server-render option chains, term structure, correlation matrices,
multi-instrument history or a large terminal grid. Those remain available from
their dedicated routes.

### Analysis routes

* `/markets` remains the authoritative live-market destination.
* `/commodities/[commodity]` remains the commodity-detail destination.
* `/options` and `/options/[commodity]` remain advanced options destinations.
* `/calendar` remains the event-radar destination.
* `/research`, `/briefs`, `/news` and `/learn` remain the research library.
* `/alerts` is a transparent alerts centre. It must not claim delivery or
  tracking functionality until a user preference and notification backend
  exists; it will route users to calendar/event and saved-market actions.

## Implementation sequence

1. Establish the new design tokens and responsive shell.
2. Replace primary mobile navigation with the five-task model.
3. Make the root route lightweight and build the Daily Brief composition from
   existing snapshot, brief and event data.
4. Add the alerts centre and route it from the shell.
5. Apply responsive hierarchy, focus states, motion reduction and touch-target
   rules to global shared UI.
6. Verify all routes, type-check, lint, run tests and production build.
7. Request an independent Claude review of the final diff and address concrete
   findings before handoff.

## Non-negotiable data and compliance rules

* No hardcoded fallback prices or fabricated analyst claims.
* Preserve the existing data freshness labels and disclaimer.
* Do not alter the sacred content publication gate or its tests.
* Do not make buy/sell calls, price targets, or unsupported performance claims.
* Preserve desktop access to all existing features.

## Acceptance criteria

* The root route no longer calls options, correlation, term-structure or
  history functions to render its primary experience.
* On a 375px-wide viewport the primary navigation has exactly five items and
  no clipped labels.
* The first mobile screen gives a market state, one lead story, live market
  watchlist and next event without a terminal-length scroll.
* Keyboard focus is visible; reduced-motion is respected; colour is not the
  sole movement indicator.
* Existing content, data and routes still build successfully.
