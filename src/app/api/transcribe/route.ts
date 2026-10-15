import { openai } from "@ai-sdk/openai";
import { transcribe } from "ai";
import { consume } from "@/lib/store";
import { getVisitorId } from "@/lib/visitor";

export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return new Response("Missing session", { status: 401 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return new Response("No audio", { status: 400 });
  if (audio.size > MAX_BYTES) return new Response("Audio too long", { status: 413 });

  if (!(await consume(visitorId, "transcribe", 80))) return new Response("Hourly limit reached", { status: 429 });

  const { text } = await transcribe({
    model: openai.transcription("gpt-4o-mini-transcribe"),
    audio: new Uint8Array(await audio.arrayBuffer()),
  });
  return Response.json({ text: text.trim() });
}
