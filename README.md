# Nova — voice-first AI assistant

**Live:** https://nova.yusufhussain.in

Talk to it or type. Nova searches the live web, checks real weather, does exact maths, opens apps — and replies out loud, in English, Hindi or Hinglish. No sign-up: open the link and start talking.

Nova 2.0 is a ground-up rebuild of my 2025 [AI Voice Assistant](https://github.com/Yusuf-Hussain25/Virtual-Assistant) (React + Express + MongoDB + Gemini).

## What it does

- **Hands-free voice mode** — speak, pause, and it answers aloud. End-of-speech is detected from the mic level (no button between turns); tap the orb to interrupt.
- **Tools, not guesses** — live web search with sources, a weather card with a 4-day forecast, exact maths and unit conversion (mathjs), and actions like "play lo-fi on YouTube".
- **Chat history without accounts** — an anonymous, HttpOnly session cookie scopes every chat and setting to one browser. "Clear history & reset" wipes it.
- **Resilient** — OpenAI is primary with automatic Gemini fallback; weather falls back from Open-Meteo to wttr.in.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4 |
| AI | AI SDK 7 · OpenAI GPT-6 Luna / GPT-6.1 Sol · Gemini fallback |
| Voice | `gpt-4o-mini-transcribe` (speech-to-text), `gpt-4o-mini-tts` (text-to-speech), Web Audio for levels |
| Data | Neon serverless Postgres + Drizzle ORM (HTTP driver, no server to run) |
| Hosting | Vercel (Singapore region, next to the database) |

## Production details

- **Cost controls** — per-visitor hourly caps on chat (40), transcription and speech (80), a 4,000-character message limit and an 8 MB audio limit. Resetting history doesn't reset the caps.
- **Isolation** — every chat read, write and delete is checked against the visitor's id; other visitors get a not-found page.
- **Streaming persistence** — the client sends only the new message; the server loads history from Postgres, validates it against the tool schemas, streams the reply and saves on completion. Regenerate trims server-side.
- **Low-latency voice** — voice turns use minimal reasoning effort and a spoken-style system prompt (short, no markdown).

## Run locally

```bash
pnpm install
cp .env.example .env.local   # add DATABASE_URL, OPENAI_API_KEY, optional GEMINI_API_KEY
pnpm drizzle-kit push        # create tables
pnpm dev
node --env-file=.env.local scripts/check-keys.mjs   # optional: verify provider keys
```

Built by [Yusuf Hussain](https://yusufhussain.in) · [LinkedIn](https://www.linkedin.com/in/yusuf-hussain)
