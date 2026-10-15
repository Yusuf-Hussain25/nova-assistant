"use client";

import { useEffect, useRef, useState } from "react";
import { openMic, recordUtterance, transcribeBlob } from "@/lib/audio";
import { IconArrowUp, IconBolt, IconChevronDown, IconGlobe, IconLock, IconMic, IconSparkle, IconStop, IconWave } from "./icons";

type Dictation = "idle" | "recording" | "transcribing";
type Model = "fast" | "smart";

const MODEL_LABEL: Record<Model, string> = { fast: "Fast", smart: "Smart" };

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[13.5px] font-medium transition-colors sm:px-4 ${
        active ? "border-accent/40 bg-accent-soft text-accent" : "border-line-strong text-ink/85 hover:border-faint hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Composer({
  busy,
  name,
  model,
  web,
  onModel,
  onWeb,
  onSend,
  onStop,
  onVoiceMode,
}: {
  busy: boolean;
  name: string;
  model: Model;
  web: boolean;
  onModel: (m: Model) => void;
  onWeb: (on: boolean) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onVoiceMode: () => void;
}) {
  const [text, setText] = useState("");
  const [dictation, setDictation] = useState<Dictation>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const stopRef = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, []);

  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText("");
  };

  const dictate = async () => {
    if (dictation === "recording") {
      stopRef.current = true;
      return;
    }
    if (dictation !== "idle") return;
    setError(null);
    let mic;
    try {
      mic = await openMic();
    } catch {
      setError("Microphone access was blocked. Allow it in your browser to dictate.");
      return;
    }
    stopRef.current = false;
    setDictation("recording");
    const blob = await recordUtterance(mic, { onLevel: setLevel, silenceMs: 1600, shouldStop: () => stopRef.current });
    mic.close();
    if (!blob) return setDictation("idle");
    setDictation("transcribing");
    try {
      const heard = await transcribeBlob(blob);
      if (heard) setText((t) => (t ? `${t} ${heard}` : heard));
      ref.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDictation("idle");
    }
  };

  const canSend = text.trim().length > 0 && !busy;

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-4 sm:px-8 sm:pb-5">
      {error ? <p className="mb-2 px-1 text-[13px] text-danger">{error}</p> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative rounded-[18px] border border-line-strong bg-surface p-3 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] transition-colors focus-within:border-faint"
      >
        {menu ? (
          <ModelMenu
            model={model}
            onPick={(m) => {
              onModel(m);
              setMenu(false);
            }}
            onClose={() => setMenu(false)}
          />
        ) : null}
        <label htmlFor="prompt" className="sr-only">
          Message {name}
        </label>
        <textarea
          id="prompt"
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            dictation === "recording"
              ? "Listening… tap the mic when you're done"
              : dictation === "transcribing"
                ? "Transcribing…"
                : `Ask ${name} anything — weather, news, maths, or "play something on YouTube"…`
          }
          className="block max-h-[220px] min-h-[48px] w-full resize-none bg-transparent px-3 pt-2 pb-2 text-[15.5px] leading-relaxed outline-none placeholder:text-faint focus-visible:outline-none"
        />

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
            <Chip onClick={() => setMenu((m) => !m)} label={`Model: ${MODEL_LABEL[model]}`}>
              {model === "fast" ? <IconBolt width={16} height={16} /> : <IconSparkle width={16} height={16} />}
              <span className="hidden sm:inline">{MODEL_LABEL[model]}</span>
              <IconChevronDown width={14} height={14} className="text-muted" />
            </Chip>
            <Chip active={web} onClick={() => onWeb(!web)} label={web ? "Web search on" : "Web search off"}>
              <IconGlobe width={16} height={16} />
              <span className="hidden sm:inline">Web</span>
            </Chip>
            <Chip onClick={onVoiceMode}>
              <IconWave width={16} height={16} />
              Talk
            </Chip>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={dictate}
              disabled={dictation === "transcribing"}
              aria-label={dictation === "recording" ? "Stop dictation" : "Dictate"}
              title={dictation === "recording" ? "Stop dictation" : "Dictate"}
              className={`relative grid size-11 place-items-center rounded-full border transition-colors disabled:opacity-50 ${
                dictation === "recording" ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-ink/85 hover:border-faint"
              }`}
            >
              {dictation === "recording" ? (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-accent"
                  style={{ transform: `scale(${1 + level * 0.35})`, opacity: 0.3 + level }}
                />
              ) : null}
              <IconMic width={18} height={18} />
            </button>

            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                className="grid size-11 place-items-center rounded-full bg-ink text-bg transition-opacity hover:opacity-85"
              >
                <IconStop width={14} height={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send"
                className="grid size-11 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_0_24px_-4px_var(--glow)] transition-[filter] hover:brightness-105 disabled:cursor-default disabled:brightness-90"
              >
                <IconArrowUp width={19} height={19} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-3 hidden items-center justify-between gap-4 px-1 text-[12px] text-muted md:flex">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd>Enter</kbd> Send
          </span>
          <span className="flex items-center gap-1.5">
            <kbd>Shift ↵</kbd> New line
          </span>
          <span className="flex items-center gap-1.5">
            <kbd>Ctrl K</kbd> Search chats
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <IconLock width={13} height={13} />
          Your chats are private to this browser.
        </span>
      </div>
    </div>
  );
}

function ModelMenu({ model, onPick, onClose }: { model: Model; onPick: (m: Model) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-40" onClick={onClose} />
      <div role="menu" className="absolute bottom-full left-2 z-50 mb-2 w-[300px] max-w-[calc(100%-16px)] rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl">
        {(
          [
            ["fast", "Fast", "GPT-6 Luna · instant answers, best for voice", IconBolt],
            ["smart", "Smart", "GPT-6.1 Sol · deeper reasoning", IconSparkle],
          ] as const
        ).map(([id, label, hint, Icon]) => (
          <button
            key={id}
            type="button"
            role="menuitemradio"
            aria-checked={model === id}
            onClick={() => onPick(id)}
            className={`flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-raised ${model === id ? "bg-raised" : ""}`}
          >
            <Icon width={17} height={17} className={`mt-0.5 ${model === id ? "text-accent" : "text-muted"}`} />
            <span>
              <span className="block text-[14px] font-medium">{label}</span>
              <span className="block text-[12px] text-muted">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
