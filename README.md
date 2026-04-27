# Sales Coach Live

Real-time AI sales coaching during live phone calls. Get objection handling, buying signal detection, and next-line suggestions from the world's greatest closers — powered by Claude AI and Gladia transcription.

## Features

- **Live Transcription** — Sub-300ms speech-to-text via Gladia WebSocket API
- **AI Coaching** — Claude analyzes conversation every 3 seconds and suggests the perfect next line
- **Sentiment Detection** — Real-time prospect sentiment tracking (interested, skeptical, objecting, ready-to-close, etc.)
- **Objection Alerts** — Instant red flash + rebuttal when an objection is detected
- **Buying Signal Detection** — Green flash when prospect shows purchase intent
- **Talk Ratio Meter** — Visual bar showing your talk % vs prospect % with a 40/60 target
- **Filler Word Counter** — Tracks ums, uhs, and likes
- **Call Summary** — Post-call report with sentiment journey, objections, buying signals, and downloadable transcript

## Setup

### 1. Clone and install

```bash
git clone https://github.com/wyliestevens/sales-coach-live.git
cd sales-coach-live
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

- **ANTHROPIC_API_KEY** — Get from [console.anthropic.com](https://console.anthropic.com/)
- **GLADIA_API_KEY** — Get from [app.gladia.io](https://app.gladia.io/)

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) and import the `sales-coach-live` repo
3. Add environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `GLADIA_API_KEY`
4. Deploy — auto-deploys on every push to `main`

## Tech Stack

- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS (dark theme)
- Anthropic Claude API (@anthropic-ai/sdk)
- Gladia real-time WebSocket API
- Web Audio API for mic capture
- Vercel for deployment
