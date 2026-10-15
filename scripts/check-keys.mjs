// Verifies the AI provider keys in .env.local work. Prints status only, never key values.
// Usage: node --env-file=.env.local scripts/check-keys.mjs
import { createGoogle } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const checks = {
  openai: () => generateText({ model: openai("gpt-6-luna"), prompt: "Say OK", maxOutputTokens: 16 }),
  gemini: () =>
    generateText({
      model: createGoogle({ apiKey: process.env.GEMINI_API_KEY })("gemini-3.5-flash-lite"),
      prompt: "Say OK",
      maxOutputTokens: 16,
    }),
};

for (const [name, run] of Object.entries(checks)) {
  try {
    const { text } = await run();
    console.log(`${name}: OK (${JSON.stringify(text.trim().slice(0, 20))})`);
  } catch (e) {
    console.log(`${name}: FAILED — ${e.statusCode ?? ""} ${(e.message ?? String(e)).slice(0, 160)}`);
  }
}
