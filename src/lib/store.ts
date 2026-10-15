import { generateId, type UIMessage } from "ai";
import { and, asc, count, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { chats, messages, settings, usage } from "@/db/schema";

export type ChatSummary = { id: string; title: string; updatedAt: string };
export type AssistantSettings = { assistantName: string; voice: string; model: "fast" | "smart" };

export const DEFAULT_SETTINGS: AssistantSettings = { assistantName: "Nova", voice: "nova", model: "fast" };

export async function listChats(visitorId: string): Promise<ChatSummary[]> {
  const rows = await db
    .select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt })
    .from(chats)
    .where(eq(chats.visitorId, visitorId))
    .orderBy(desc(chats.updatedAt))
    .limit(60);
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}

/** Returns the chat's messages, or null if the chat belongs to someone else. */
export async function loadChat(id: string, visitorId: string): Promise<UIMessage[] | null> {
  const [chat] = await db.select().from(chats).where(eq(chats.id, id));
  if (!chat) return [];
  if (chat.visitorId !== visitorId) return null;
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  return rows.map((r) => ({ id: r.id, role: r.role, parts: r.parts }));
}

export async function saveChat(id: string, visitorId: string, all: UIMessage[], title?: string) {
  const now = new Date();
  await db
    .insert(chats)
    .values({ id, visitorId, title: title ?? "New chat", updatedAt: now })
    .onConflictDoUpdate({ target: chats.id, set: { updatedAt: now } });

  // Messages are replaced wholesale: regenerate can drop the tail of a chat.
  await db.delete(messages).where(eq(messages.chatId, id));
  if (all.length === 0) return;
  const base = now.getTime() - all.length;
  await db.insert(messages).values(
    all.map((m, i) => ({
      id: m.id || generateId(),
      chatId: id,
      role: m.role,
      parts: m.parts,
      createdAt: new Date(base + i),
    })),
  );
}

/** Upsert, because titling can race the first save of the chat. */
export async function setTitle(id: string, visitorId: string, title: string) {
  await db
    .insert(chats)
    .values({ id, visitorId, title })
    .onConflictDoUpdate({ target: chats.id, set: { title }, setWhere: eq(chats.visitorId, visitorId) });
}

export async function deleteChat(id: string, visitorId: string) {
  await db.delete(chats).where(and(eq(chats.id, id), eq(chats.visitorId, visitorId)));
}

export async function deleteChats(ids: string[], visitorId: string) {
  if (ids.length) await db.delete(chats).where(and(inArray(chats.id, ids), eq(chats.visitorId, visitorId)));
}

/** Usage rows are kept so a reset can't be used to dodge the hourly limit. */
export async function clearVisitor(visitorId: string) {
  await db.delete(chats).where(eq(chats.visitorId, visitorId));
  await db.delete(settings).where(eq(settings.visitorId, visitorId));
}

export async function getSettings(visitorId: string): Promise<AssistantSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.visitorId, visitorId));
  if (!row) return DEFAULT_SETTINGS;
  return {
    assistantName: row.assistantName,
    voice: row.voice,
    model: row.model === "smart" ? "smart" : "fast",
  };
}

export async function putSettings(visitorId: string, next: AssistantSettings) {
  await db
    .insert(settings)
    .values({ visitorId, ...next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.visitorId, set: { ...next, updatedAt: new Date() } });
}

/**
 * Public demo, no login: cap how much one visitor can spend.
 * Returns false once the visitor has used `limit` calls of `kind` in the last hour.
 */
export async function consume(visitorId: string, kind: string, limit: number): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(usage)
    .where(and(eq(usage.visitorId, visitorId), eq(usage.kind, kind), gt(usage.createdAt, since)));
  if (n >= limit) return false;
  await db.insert(usage).values({ id: generateId(), visitorId, kind });
  return true;
}
