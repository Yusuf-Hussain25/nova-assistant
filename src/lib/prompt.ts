import { createGoogle } from "@ai-sdk/google";
import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { creatorBrief } from "./creator";
import { withFallback } from "./fallback";

// Gemini is the safety net: if OpenAI is down or out of quota, answers still arrive.
const google = process.env.GEMINI_API_KEY ? createGoogle({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const MODELS = {
  fast: withFallback(openai("gpt-6-luna"), google?.("gemini-3.8-flash") ?? null),
  smart: withFallback(openai("gpt-6.1-sol"), google?.("gemini-3.8-flash") ?? null),
} as const;

/** Titles are cheap housekeeping: Gemini Flash-Lite when available, OpenAI otherwise. */
export const TITLE_MODEL = google ? withFallback(google("gemini-3.5-flash-lite"), openai("gpt-6-luna")) : openai("gpt-6-luna");

/** Voice needs a quick first word, so think less there. */
export function reasoning(voice: boolean) {
  return {
    openai: { reasoningEffort: voice ? "minimal" : "low" } satisfies OpenAILanguageModelResponsesOptions,
  };
}

export function buildInstructions(opts: { name: string; timeZone: string; voice: boolean }) {
  const now = new Date().toLocaleString("en-IN", {
    timeZone: opts.timeZone,
    dateStyle: "full",
    timeStyle: "short",
  });

  return `You are ${opts.name}, a sharp, warm personal AI assistant.

${creatorBrief()}

Right now it is ${now} (${opts.timeZone}) for the user. Use this for any date, day or time question.

How you work:
- Reply in the user's language. If they write in Hindi or Hinglish, reply the same way.
- Lead with the answer. No filler like "Great question" or "As an AI".
- Use tools instead of guessing:
  - getWeather for ANY weather, rain, temperature or forecast question, in any language. Never use webSearch for weather.
  - webSearch for anything else current: news, prices, scores, releases, people, facts that may have changed. Cite sources inline as markdown links.
  - calculate for any maths or unit conversion, even simple ones.
  - openLink when the user asks you to open, play or search something on a site or app. After calling it, say in one short line what you opened.
- If a request is ambiguous, make a sensible assumption and say it in a few words rather than asking.
${
  opts.voice
    ? `
VOICE MODE IS ON. Your reply will be spoken aloud:
- Keep it to 1–3 short sentences unless asked for detail.
- Plain spoken language only: no markdown, lists, tables, links, emojis or code.
- Say numbers the way a person would say them.`
    : `
Formatting: use markdown when it helps (short lists, tables for comparisons, code blocks with a language). Keep answers tight.`
}`;
}
