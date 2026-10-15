import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  streamText,
  toUIMessageStream,
  TypeValidationError,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { after } from "next/server";
import { z } from "zod";
import { buildInstructions, MODELS, reasoning, TITLE_MODEL } from "@/lib/prompt";
import { consume, getSettings, loadChat, saveChat, setTitle } from "@/lib/store";
import { tools } from "@/lib/tools";
import { getVisitorId } from "@/lib/visitor";

export const maxDuration = 60;

const Body = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  message: z.unknown().optional(),
  trigger: z.enum(["submit-message", "regenerate-message"]),
  messageId: z.string().optional(),
  voice: z.boolean().optional(),
  web: z.boolean().optional(),
  timeZone: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return new Response("Missing session", { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { id, message, trigger, messageId, voice = false, web = true } = parsed.data;

  if (!(await consume(visitorId, "chat", 40))) {
    return new Response("You've hit the hourly limit for this demo. Try again in a bit.", { status: 429 });
  }

  const previous = await loadChat(id, visitorId);
  if (previous === null) return new Response("Not found", { status: 404 });

  let history: UIMessage[] = previous;
  if (trigger === "regenerate-message") {
    // Drop the assistant reply being regenerated (and anything after it).
    const cut = messageId ? history.findIndex((m) => m.id === messageId) : history.findLastIndex((m) => m.role === "assistant");
    if (cut >= 0) history = history.slice(0, cut);
  } else {
    history = [...history, message as UIMessage];
  }

  let validated: UIMessage[];
  try {
    validated = await validateUIMessages({ messages: history, tools });
  } catch (error) {
    if (error instanceof TypeValidationError) return new Response("Invalid message", { status: 400 });
    throw error;
  }

  const last = validated.at(-1);
  const lastText = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
  if (lastText.length > 4000) return new Response("Message too long", { status: 413 });

  const settings = await getSettings(visitorId);
  const timeZone = isValidTimeZone(parsed.data.timeZone) ? parsed.data.timeZone! : "Asia/Kolkata";
  const isFirstTurn = previous.length === 0;

  const result = streamText({
    model: MODELS[settings.model],
    instructions: buildInstructions({ name: settings.assistantName, timeZone, voice }),
    messages: await convertToModelMessages(validated),
    tools,
    activeTools: web ? undefined : ["aboutCreator", "getWeather", "calculate", "openLink"],
    stopWhen: isStepCount(6),
    providerOptions: reasoning(voice),
  });

  const response = createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: validated,
      onEnd: async ({ messages }) => {
        await saveChat(id, visitorId, messages);
      },
    }),
  });

  if (isFirstTurn && lastText) after(() => nameChat(id, visitorId, lastText));
  return response;
}

async function nameChat(id: string, visitorId: string, firstMessage: string) {
  try {
    const { text } = await generateText({
      model: TITLE_MODEL,
      instructions:
        "Write a 2–5 word title for a chat that starts with the user's message. Title case, no quotes, no trailing punctuation.",
      prompt: firstMessage.slice(0, 500),
      providerOptions: reasoning(true),
    });
    const title = text.trim().replace(/^["']|["'.]$/g, "").slice(0, 60);
    if (title) await setTitle(id, visitorId, title);
  } catch {
    await setTitle(id, visitorId, firstMessage.slice(0, 40));
  }
}

function isValidTimeZone(tz?: string) {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
