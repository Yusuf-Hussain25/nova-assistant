import { cookies } from "next/headers";
import { VISITOR_COOKIE } from "./visitor-cookie";

export async function getVisitorId(): Promise<string | null> {
  const id = (await cookies()).get(VISITOR_COOKIE)?.value;
  return id && /^[0-9a-f-]{36}$/.test(id) ? id : null;
}
