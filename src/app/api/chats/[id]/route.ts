import { deleteChat } from "@/lib/store";
import { getVisitorId } from "@/lib/visitor";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/chats/[id]">) {
  const visitorId = await getVisitorId();
  if (!visitorId) return new Response("Missing session", { status: 401 });
  const { id } = await ctx.params;
  await deleteChat(id, visitorId);
  return new Response(null, { status: 204 });
}
