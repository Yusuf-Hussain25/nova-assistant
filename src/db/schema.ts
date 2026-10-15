import type { UIMessage } from "ai";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chats_visitor_updated_idx").on(t.visitorId, t.updatedAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").$type<UIMessage["role"]>().notNull(),
    parts: jsonb("parts").$type<UIMessage["parts"]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_chat_created_idx").on(t.chatId, t.createdAt)],
);

export const settings = pgTable("settings", {
  visitorId: text("visitor_id").primaryKey(),
  assistantName: text("assistant_name").notNull().default("Nova"),
  voice: text("voice").notNull().default("nova"),
  model: text("model").notNull().default("fast"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usage = pgTable(
  "usage",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_visitor_created_idx").on(t.visitorId, t.createdAt)],
);
