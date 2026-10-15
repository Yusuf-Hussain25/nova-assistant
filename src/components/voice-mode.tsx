"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openMic, recordUtterance, Speaker, transcribeBlob, type Mic } from "@/lib/audio";
import { IconMic, IconX } from "./icons";

type Phase = "starting" | "listening" | "transcribing" | "thinking" | "speaking" | "paused" | "error";

const LABEL: Record<Phase, string> = {
  starting: "Starting…",
  listening: "Listening",
  transcribing: "Got it…",
  thinking: "Thinking",
  speaking: "Speaking — tap to interrupt",
  paused: "Paused — tap to talk",
  error: "Something went wrong",
};

/**
 * Hands-free conversation: listen → transcribe → ask → speak → listen again.
 * The user never presses a button between turns; end-of-speech is detected from the mic level.
 */
export function VoiceMode({
  name,
  voice,
  ask,
  onClose,
}: {
  name: string;
  voice: string;
  /** Sends the text as a chat message and resolves with the assistant's reply text. */
  ask: (text: string) => Promise<string>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const orb = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const mic = useRef<Mic | null>(null);
  const speaker = useRef(new Speaker());
  const active = useRef(true);
  const listenAbort = useRef<AbortController | null>(null);
  const smoothed = useRef(0);

  const setLevel = useCallback((level: number) => {
    smoothed.current = smoothed.current * 0.6 + level * 0.4;
    const l = smoothed.current;
    if (orb.current) orb.current.style.transform = `scale(${1 + l * 0.28})`;
    if (ring.current) {
      ring.current.style.transform = `scale(${1.08 + l * 0.6})`;
      ring.current.style.opacity = String(0.12 + l * 0.5);
    }
  }, []);

  const turn = useCallback(async () => {
    while (active.current) {
      setPhase("listening");
      listenAbort.current = new AbortController();
      const blob = await recordUtterance(mic.current!, { onLevel: setLevel, signal: listenAbort.current.signal });
      if (!active.current) return;
      if (!blob) {
        // Aborted or silence: pause instead of spinning forever.
        setPhase("paused");
        return;
      }

      setPhase("transcribing");
      const text = await transcribeBlob(blob).catch(() => "");
      if (!active.current) return;
      if (!text) continue;
      setHeard(text);
      setReply("");

      setPhase("thinking");
      const answer = await ask(text).catch((e: Error) => {
        setError(e.message);
        return "";
      });
      if (!active.current) return;
      if (!answer) {
        setPhase("error");
        return;
      }
      setReply(answer);

      setPhase("speaking");
      await speaker.current.play(answer, voice, setLevel);
    }
  }, [ask, setLevel, voice]);

  const start = useCallback(async () => {
    try {
      mic.current ??= await openMic();
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings to talk.");
      setPhase("error");
      return;
    }
    void turn();
  }, [turn]);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    const s = speaker.current;
    openMic().then(
      (m) => {
        if (cancelled) return m.close();
        mic.current = m;
        void turn();
      },
      () => {
        if (cancelled) return;
        setError("Microphone access was blocked. Allow it in your browser settings to talk.");
        setPhase("error");
      },
    );
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      active.current = false;
      window.removeEventListener("keydown", onKey);
      listenAbort.current?.abort();
      s.stop();
      mic.current?.close();
      mic.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tapOrb = () => {
    if (phase === "speaking") {
      // Barge-in: cut the reply and listen. turn()'s loop continues once play() resolves.
      speaker.current.stop();
    } else if (phase === "paused" || phase === "error") {
      setError("");
      void start();
    }
  };

  const pulsing = phase === "thinking" || phase === "transcribing" || phase === "starting";

  return (
    <div role="dialog" aria-modal aria-label={`Voice conversation with ${name}`} className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="text-[14px] font-medium">{name}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="End voice conversation"
          className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors hover:text-ink"
        >
          <IconX width={18} height={18} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <button type="button" onClick={tapOrb} aria-label={LABEL[phase]} className="relative grid size-[240px] place-items-center">
          <div
            ref={ring}
            aria-hidden
            className="absolute inset-[30px] rounded-full border border-[var(--orb)] transition-transform duration-75"
            style={{ opacity: 0.12 }}
          />
          <div
            ref={orb}
            aria-hidden
            className={`size-[180px] rounded-full bg-[var(--orb)] shadow-[0_0_90px_-6px_var(--glow)] transition-transform duration-75 ${
              pulsing ? "animate-pulse" : ""
            } ${phase === "paused" || phase === "error" ? "opacity-30" : ""}`}
          />
          {phase === "paused" ? <IconMic width={36} height={36} className="absolute text-bg" /> : null}
        </button>

        <div className="mt-10 h-6 text-[15px] font-medium text-muted" aria-live="polite">
          {LABEL[phase]}
        </div>

        <div className="mt-6 w-full max-w-[560px] space-y-3 text-center">
          {heard ? <p className="text-[15px] text-muted">“{heard}”</p> : null}
          {reply ? <p className="line-clamp-4 text-[18px] leading-relaxed">{reply}</p> : null}
          {error ? <p className="text-[14px] text-danger">{error}</p> : null}
          {!heard && phase === "listening" ? (
            <p className="text-[15px] text-faint">Try “What&apos;s the weather in Patna?” or “Play Arijit Singh on YouTube”.</p>
          ) : null}
        </div>
      </div>

      <p className="pb-6 text-center text-[12px] text-faint">Speaks English, Hindi and Hinglish · Esc to close</p>
    </div>
  );
}
