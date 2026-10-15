import { z } from "zod";
import { getSettings, putSettings } from "@/lib/store";
import { getVisitorId } from "@/lib/visitor";
import { VOICES } from "@/lib/voices";

const Settings = z.object({
  assistantName: z.string().trim().min(1).max(24),
  voice: z.enum(VOICES.map((v) => v.id) as [string, ...string[]]),
  model: z.enum(["fast", "smart"]),
});

export async function GET() {
  const visitorId = await getVisitorId();
  if (!visitorId) return new Response("Missing session", { status: 401 });
  return Response.json(await getSettings(visitorId));
}

export async function PUT(req: Request) {
  const visitorId = await getVisitorId();
  if (!visitorId) return new Response("Missing session", { status: 401 });
  const parsed = Settings.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  await putSettings(visitorId, parsed.data);
  return Response.json(parsed.data);
}
