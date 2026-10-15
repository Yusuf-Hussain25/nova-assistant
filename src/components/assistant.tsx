"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Speaker } from "@/lib/audio";
import type { AssistantSettings, ChatSummary } from "@/lib/store";
import type { AssistantMessage } from "@/lib/tools";
import { Composer } from "./composer";
import {
  IconAlert,
  IconArrowRight,
  IconCalc,
  IconChat,
  IconCloudSun,
  IconGlobe,
  IconMenu,
  IconMoon,
  IconPlay,
  IconPlus,
  IconSidebar,
  IconSun,
  IconWave,
} from "./icons";
import { Message, messageText } from "./message";
import { SettingsDialog } from "./settings-dialog";
import { Sidebar } from "./sidebar";
import { VoiceMode } from "./voice-mode";

const CARDS = [
  {
    icon: IconCloudSun,
    title: "Live weather",
    body: "Current conditions and a 4-day forecast for any city.",
    prompt: "What's the weather in Patna right now, and should I carry an umbrella this week?",
  },
  {
    icon: IconGlobe,
    title: "Search the web",
    body: "Fresh answers from the live web, with sources.",
    prompt: "What are the biggest AI announcements this week? Give me sources.",
  },
  {
    icon: IconCalc,
    title: "Exact maths",
    body: "GST, EMIs, percentages and unit conversions — calculated, not guessed.",
    prompt: "What's 18% GST on ₹24,999, and the total I'd pay?",
  },
  {
    icon: IconPlay,
    title: "Open any app",
    body: "Play on YouTube or Spotify, open Maps, Gmail and more.",
    prompt: "Play some lo-fi study music on YouTube",
  },
];

type Theme = "dark" | "light";
const themeListeners = new Set<() => void>();
const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
function setTheme(t: Theme) {
  if (t === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem("theme", t);
  } catch {}
  themeListeners.forEach((l) => l());
}
const subscribeTheme = (l: () => void) => {
  themeListeners.add(l);
  return () => themeListeners.delete(l);
};

export function Assistant({
  chatId,
  initialMessages,
  initialChats,
  initialSettings,
}: {
  chatId: string;
  initialMessages: AssistantMessage[];
  initialChats: ChatSummary[];
  initialSettings: AssistantSettings;
}) {
  const router = useRouter();
  const [chats, setChats] = useState(initialChats);
  const [settings, setSettings] = useState(initialSettings);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [web, setWeb] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as Theme);

  const historyIds = useMemo(() => new Set(initialMessages.map((m) => m.id)), [initialMessages]);
  const pending = useRef<{ resolve: (t: string) => void; reject: (e: Error) => void } | null>(null);
  const speaker = useRef<Speaker | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  const refreshChats = useCallback(async () => {
    const res = await fetch("/api/chats");
    if (res.ok) setChats(await res.json());
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages, body, trigger, messageId }) => ({
          body: {
            id,
            trigger,
            messageId,
            message: trigger === "submit-message" ? messages.at(-1) : undefined,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...body,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, regenerate, stop, status, error } = useChat<AssistantMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    onFinish: ({ message, isAbort }) => {
      pending.current?.resolve(isAbort ? "" : messageText(message));
      pending.current = null;
      void refreshChats();
      // The title is written just after the response ends.
      setTimeout(refreshChats, 2500);
    },
    onError: (e) => {
      pending.current?.reject(e);
      pending.current = null;
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const title = chats.find((c) => c.id === chatId)?.title ?? "New conversation";

  // Keep the newest message in view while streaming, unless the user scrolled up.
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current && messages.length > 0) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = (text: string, body?: Record<string, unknown>) => {
    pinned.current = true;
    if (window.location.pathname !== `/c/${chatId}`) window.history.replaceState(null, "", `/c/${chatId}`);
    return sendMessage({ text }, { body: { web, ...body } });
  };

  const ask = useCallback(
    (text: string) =>
      new Promise<string>((resolve, reject) => {
        pending.current = { resolve, reject };
        void send(text, { voice: true });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendMessage, web],
  );

  const saveSettings = async (next: AssistantSettings) => {
    setSettings(next);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  };

  const toggleSpeak = async (m: AssistantMessage) => {
    speaker.current ??= new Speaker();
    if (speakingId === m.id) {
      speaker.current.stop();
      return;
    }
    setSpeakingId(m.id);
    await speaker.current.play(messageText(m), settings.voice);
    setSpeakingId((id) => (id === m.id ? null : id));
  };

  const newChat = () => {
    setSidebarOpen(false);
    if (messages.length === 0) return;
    router.push("/");
  };

  const deleteChat = async (id: string) => {
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    setChats((list) => list.filter((c) => c.id !== id));
    if (id === chatId) router.push("/");
  };

  const errorText = error ? (error.message.length < 200 ? error.message : "Something went wrong.") : null;
  const name = settings.assistantName;

  return (
    <div className="flex h-dvh bg-bg">
      {collapsed ? null : (
        <Sidebar
          chats={chats}
          currentId={chatId}
          name={name}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCollapse={() => setCollapsed(true)}
          onNewChat={newChat}
          onDelete={deleteChat}
          onSettings={() => {
            setSidebarOpen(false);
            setSettingsOpen(true);
          }}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-line px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-raised md:hidden"
            >
              <IconMenu width={20} height={20} />
            </button>
            {collapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  aria-label="Show sidebar"
                  className="hidden size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink md:grid"
                >
                  <IconSidebar width={19} height={19} />
                </button>
                <button
                  type="button"
                  onClick={newChat}
                  aria-label="New chat"
                  className="hidden size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink md:grid"
                >
                  <IconPlus width={19} height={19} />
                </button>
              </>
            ) : null}
            <IconChat width={19} height={19} className="ml-1 hidden shrink-0 text-muted sm:block" />
            <h2 className="truncate text-[15px] font-medium">{title}</h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden h-10 items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-4 text-[13px] font-medium text-accent sm:flex">
              <span className="size-2 rounded-full bg-accent" />
              {web ? "Tools enabled" : "Web off"}
            </span>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="grid size-10 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              {theme === "dark" ? <IconSun width={19} height={19} /> : <IconMoon width={19} height={19} />}
            </button>
            <button
              type="button"
              onClick={newChat}
              aria-label="New chat"
              className="grid size-10 place-items-center rounded-lg text-muted hover:bg-raised md:hidden"
            >
              <IconPlus width={20} height={20} />
            </button>
          </div>
        </header>

        <div ref={scroller} onScroll={onScroll} className="relative flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-10 sm:px-8">
              <div aria-hidden className="dots pointer-events-none absolute inset-0" />
              <div className="relative flex w-full max-w-[1040px] flex-col items-center">
                <div className="glow grid size-[92px] place-items-center rounded-[24px] bg-surface text-accent">
                  <IconWave width={40} height={40} strokeWidth={2} />
                </div>
                <h1 className="mt-9 text-center text-[34px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[48px]">
                  Ask anything. <span className="text-accent">Just say it.</span>
                </h1>
                <p className="mt-4 max-w-[560px] text-center text-[16px] leading-relaxed text-muted sm:text-[18px]">
                  {name} is your voice-first assistant for live answers, weather, maths and apps — in English, Hindi or Hinglish.
                </p>

                <div className="mt-11 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {CARDS.map(({ icon: Icon, title: cardTitle, body, prompt }) => (
                    <button
                      key={cardTitle}
                      type="button"
                      onClick={() => send(prompt)}
                      className="group flex flex-col rounded-2xl border border-line bg-surface/70 p-5 text-left transition-colors hover:border-line-strong hover:bg-surface"
                    >
                      <span className="grid size-11 place-items-center rounded-xl bg-raised text-accent">
                        <Icon width={21} height={21} />
                      </span>
                      <span className="mt-5 text-[16px] font-semibold tracking-[-0.01em]">{cardTitle}</span>
                      <span className="mt-1.5 flex items-end justify-between gap-3">
                        <span className="text-[14px] leading-snug text-muted">{body}</span>
                        <IconArrowRight
                          width={18}
                          height={18}
                          className="shrink-0 text-ink/70 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                        />
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[14px] text-muted">
                  <button type="button" onClick={() => setVoiceOpen(true)} className="flex items-center gap-2 transition-colors hover:text-ink">
                    <span className="size-2 animate-pulse rounded-full bg-accent" />
                    Or tap <span className="font-medium text-ink">Talk</span> and just speak
                  </button>
                  <button
                    type="button"
                    onClick={() => send(`Who built ${name}? Tell me about him.`)}
                    className="flex items-center gap-2 transition-colors hover:text-ink"
                  >
                    <Image src="/yusuf/avatar.jpg" alt="" width={22} height={22} className="size-[22px] rounded-full object-cover" />
                    Who built {name}?
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[800px] space-y-8 px-4 pt-8 pb-10 sm:px-6">
              {messages.map((m, i) => (
                <Message
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1}
                  streaming={busy && i === messages.length - 1 && m.role === "assistant"}
                  fresh={!historyIds.has(m.id) && !voiceOpen}
                  speaking={speakingId === m.id}
                  onSpeak={() => toggleSpeak(m)}
                  onRegenerate={() => regenerate({ body: { web } })}
                />
              ))}
              {status === "submitted" && messages.at(-1)?.role === "user" ? (
                <div className="working text-[14px] font-medium">Thinking…</div>
              ) : null}
              {errorText ? (
                <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-[14px]">
                  <IconAlert width={16} height={16} className="mt-0.5 shrink-0 text-danger" />
                  <span className="flex-1">{errorText}</span>
                  <button type="button" onClick={() => regenerate({ body: { web } })} className="shrink-0 font-medium underline underline-offset-2">
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <Composer
          busy={busy}
          name={name}
          model={settings.model}
          web={web}
          onModel={(model) => void saveSettings({ ...settings, model })}
          onWeb={setWeb}
          onSend={(t) => void send(t)}
          onStop={stop}
          onVoiceMode={() => setVoiceOpen(true)}
        />
      </main>

      {voiceOpen ? (
        <VoiceMode
          name={name}
          voice={settings.voice}
          ask={ask}
          onClose={() => {
            stop();
            setVoiceOpen(false);
          }}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsDialog
          initial={settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={(s) => {
            setSettings(s);
            setSettingsOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
