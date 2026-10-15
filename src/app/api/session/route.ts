import { cookies } from "next/headers";
import { clearVisitor } from "@/lib/store";
import { VISITOR_COOKIE } from "@/lib/visitor-cookie";
import { getVisitorId } from "@/lib/visitor";

/** "Log out": wipe this visitor's chats and settings, then drop the session cookie. */
export async function DELETE() {
  const visitorId = await getVisitorId();
  if (visitorId) await clearVisitor(visitorId);
  (await cookies()).delete(VISITOR_COOKIE);
  return new Response(null, { status: 204 });
}
