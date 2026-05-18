# BhaavBrief — India's Commodity Intelligence

A fully automated commodity intelligence publication built with Next.js, GitHub Actions, and Claude AI.

## How it works

Every weekday at 6:30 AM IST:
1. GitHub Actions fetches live commodity prices (Yahoo Finance, 15-min delay)
2. Fetches commodity headlines from Yahoo Finance RSS
3. Claude AI generates the morning brief as an MDX file
4. A Pull Request is created for your review
5. You review on your phone, merge if happy (~5 mins)
6. Vercel auto-deploys the updated website
7. Brevo sends the newsletter email to all subscribers

## Setup

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/bhaavbrief.git
cd bhaavbrief
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
# Fill in your keys
```

### 3. Deploy to Vercel
- Go to vercel.com → New Project → Import from GitHub
- Add environment variables in Vercel dashboard
- Deploy

### 4. Set up GitHub Secrets
In your GitHub repo → Settings → Secrets → Actions, add:
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `BREVO_API_KEY` — from Brevo dashboard → API Keys
- `BREVO_LIST_ID` — your Brevo contact list ID
- `SENDER_EMAIL` — your verified sender email

### 5. Set up Brevo
- Create a free account at brevo.com
- Create a Contact List (note the ID)
- Verify your sender email (brief@bhaavbrief.in)
- Get your API key from Settings → API Keys

### 6. Point domain to Vercel
- In Vercel: Project → Domains → Add bhaavbrief.in
- In GoDaddy DNS: Update A record to Vercel's IP

## Running locally

```bash
npm run dev
# Open http://localhost:3000
```

## Manually trigger brief generation

```bash
ANTHROPIC_API_KEY=your-key node scripts/generate-brief.js
```

Or trigger the GitHub Action manually from the Actions tab.

## Content structure

Each brief is an MDX file in `content/briefs/`:

```
---
title: "Your headline"
date: "2026-05-19"
edition: 1
summary: "One line summary for email preview"
tags: ["energy"]
commodities: ["MCX Crude", "MCX Gold"]
published: true
---

Brief content here in markdown...
```

## Monthly cost estimate

| Service | Cost |
|---|---|
| Vercel (hosting) | ₹0 |
| GitHub (code + Actions) | ₹0 |
| Yahoo Finance (prices) | ₹0 |
| Brevo (email, up to 9K/day) | ₹0 |
| Anthropic Claude API (~30 briefs/month) | ~₹400 |
| **Total** | **~₹400/month** |

## License

Private — BhaavBrief © 2026
