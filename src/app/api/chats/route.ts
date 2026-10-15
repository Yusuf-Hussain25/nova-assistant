import { listChats } from "@/lib/store";
import { getVisitorId } from "@/lib/visitor";

export async function GET() {
  const visitorId = await getVisitorId();
  if (!visitorId) return Response.json([]);
  return Response.json(await listChats(visitorId));
}
