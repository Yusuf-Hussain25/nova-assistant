import { openai } from "@ai-sdk/openai";
import { generateSpeech } from "ai";
import { z } from "zod";
import { VOICES } from "@/lib/voices";
import { consume } from "@/lib/store";
import { getVisitorId } from "@/lib/visitor";

export const maxDuration = 30;

const Body = z.object({
  text: z.string().min(1).max(1500),
  voice: z.enum(VOICES.map((v) => v.id) as [string, ...string[]]).default("nova"),
});

export async function POST(req: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return new Response("Missing session", { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  if (!(await consume(visitorId, "speak", 80))) return new Response("Hourly limit reached", { status: 429 });

  const { audio } = await generateSpeech({
    model: openai.speech("gpt-4o-mini-tts"),
    text: parsed.data.text,
    voice: parsed.data.voice,
    instructions: "Speak naturally and warmly, at a relaxed conversational pace, like a helpful friend.",
  });
  return new Response(audio.uint8Array as Uint8Array<ArrayBuffer>, {
    headers: { "Content-Type": audio.mediaType || "audio/mpeg", "Cache-Control": "no-store" },
  });
}
