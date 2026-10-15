"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatSummary } from "@/lib/store";
import { IconChat, IconChevronRight, IconPlus, IconSearch, IconSettings, IconSidebar, IconTrash, Logo } from "./icons";

function group(chats: ChatSummary[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const out: [string, ChatSummary[]][] = [
    ["Today", []],
    ["Yesterday", []],
    ["Previous 7 days", []],
    ["Older", []],
  ];
  for (const c of chats) {
    const t = new Date(c.updatedAt).getTime();
    out[t >= today ? 0 : t >= today - 864e5 ? 1 : t >= today - 7 * 864e5 ? 2 : 3][1].push(c);
  }
  return out.filter(([, list]) => list.length);
}

function stamp(iso: string, label: string) {
  const d = new Date(iso);
  return label === "Today" || label === "Yesterday"
    ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Sidebar({
  chats,
  currentId,
  name,
  open,
  onClose,
  onCollapse,
  onNewChat,
  onDelete,
  onSettings,
}: {
  chats: ChatSummary[];
  currentId: string;
  name: string;
  open: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onSettings: () => void;
}) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return group(q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats);
  }, [chats, query]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col border-r border-line bg-side transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[68px] items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[19px] font-semibold tracking-[-0.02em]">{name}</span>
            <span aria-label="Online" className="size-2 rounded-full bg-accent shadow-[0_0_10px_var(--glow)]" />
          </div>
          <button
            type="button"
            onClick={() => (window.matchMedia("(min-width: 768px)").matches ? onCollapse() : onClose())}
            aria-label="Hide sidebar"
            className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <IconSidebar width={19} height={19} />
          </button>
        </div>

        <div className="space-y-3 px-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl bg-accent px-4 text-[14.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-105"
          >
            <IconPlus width={18} height={18} strokeWidth={2.2} />
            New chat
          </button>

          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-surface/60 px-3.5 text-muted transition-colors focus-within:border-line-strong">
            <IconSearch width={16} height={16} />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint"
            />
            <kbd className="hidden md:inline">Ctrl K</kbd>
          </label>
        </div>

        <nav aria-label="Chat history" className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
          {chats.length === 0 ? (
            <p className="px-2 text-[13px] leading-relaxed text-faint">
              Your conversations appear here. They&apos;re saved on this browser, no account needed.
            </p>
          ) : groups.length === 0 ? (
            <p className="px-2 text-[13px] text-faint">No conversations match “{query}”.</p>
          ) : (
            groups.map(([label, list]) => (
              <div key={label} className="mb-5">
                <div className="px-2 pb-1.5 text-[13px] font-medium text-muted">{label}</div>
                <ul className="space-y-0.5">
                  {list.map((c) => {
                    const active = c.id === currentId;
                    return (
                      <li key={c.id} className="group/item relative">
                        <Link
                          href={`/c/${c.id}`}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={`flex h-10 items-center gap-3 rounded-lg pr-2 pl-2.5 text-[13.5px] transition-colors ${
                            active ? "bg-raised text-ink" : "text-ink/85 hover:bg-raised/60"
                          }`}
                        >
                          <IconChat width={17} height={17} className={`shrink-0 ${active ? "text-accent" : "text-muted"}`} />
                          <span className="min-w-0 flex-1 truncate">{c.title}</span>
                          <span className="shrink-0 text-[11.5px] text-faint tabular-nums md:group-hover/item:invisible">
                            {stamp(c.updatedAt, label)}
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete(c.id)}
                          aria-label={`Delete “${c.title}”`}
                          className="absolute top-1/2 right-1.5 hidden size-7 -translate-y-1/2 place-items-center rounded-md text-faint transition-colors hover:text-danger md:group-hover/item:grid md:focus:grid"
                        >
                          <IconTrash width={14} height={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>

        <div className="border-t border-line px-3 pt-2 pb-3">
          <button
            type="button"
            onClick={onSettings}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-[14px] text-ink/85 transition-colors hover:bg-raised"
          >
            <IconSettings width={18} height={18} className="text-muted" />
            Settings
          </button>
          <a
            href="https://yusufhussain.in"
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-raised"
          >
            <Image
              src="/yusuf/avatar.jpg"
              alt="Yusuf Hussain"
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full object-cover ring-1 ring-accent/40"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">Built by Yusuf Hussain</span>
              <span className="block text-[12px] text-muted">AI Full-Stack Engineer</span>
            </span>
            <IconChevronRight width={16} height={16} className="text-muted" />
          </a>
        </div>
      </aside>
    </>
  );
}
