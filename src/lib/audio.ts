"use client";

/**
 * Browser audio for the assistant:
 * - Mic: capture one utterance and stop on its own when the speaker goes quiet.
 * - Speaker: play TTS from /api/speak, exposing a live level for the orb.
 */

let sharedCtx: AudioContext | null = null;
export function audioContext() {
  sharedCtx ??= new AudioContext();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

function rms(analyser: AnalyserNode, buf: Float32Array<ArrayBuffer>) {
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  return Math.sqrt(sum / buf.length);
}

function pickMimeType() {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export type Mic = { stream: MediaStream; analyser: AnalyserNode; close: () => void };

export async function openMic(): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = audioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  return {
    stream,
    analyser,
    close: () => {
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

/**
 * Records until the user stops talking (silenceMs of quiet after speech),
 * `signal` aborts, or `stopRef.current` flips. Resolves null if nobody spoke.
 */
export function recordUtterance(
  mic: Mic,
  opts: {
    onLevel?: (level: number) => void;
    signal?: AbortSignal;
    silenceMs?: number;
    maxMs?: number;
    /** Manual stop (push-to-talk). Checked every frame. */
    shouldStop?: () => boolean;
  } = {},
): Promise<Blob | null> {
  const { silenceMs = 1100, maxMs = 30_000 } = opts;
  const recorder = new MediaRecorder(mic.stream, { mimeType: pickMimeType() || undefined });
  const chunks: Blob[] = [];
  const buf = new Float32Array(mic.analyser.fftSize);

  return new Promise((resolve) => {
    let spoke = false;
    let quietSince = 0;
    let noiseFloor = 0.01;
    const started = performance.now();
    let raf = 0;

    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      cancelAnimationFrame(raf);
      opts.onLevel?.(0);
      resolve(spoke && chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
    };

    const stop = () => recorder.state !== "inactive" && recorder.stop();
    opts.signal?.addEventListener("abort", () => {
      spoke = false;
      stop();
    });

    const tick = () => {
      const now = performance.now();
      const level = rms(mic.analyser, buf);
      // Learn the room's noise floor in the first 400ms.
      if (now - started < 400) noiseFloor = Math.max(noiseFloor, level);
      const threshold = Math.max(0.018, noiseFloor * 2.2);
      opts.onLevel?.(Math.min(1, level * 8));

      if (level > threshold) {
        spoke = true;
        quietSince = 0;
      } else if (spoke) {
        quietSince ||= now;
        if (now - quietSince > silenceMs) return stop();
      }
      if (opts.shouldStop?.()) return stop();
      if (now - started > maxMs) return stop();
      raf = requestAnimationFrame(tick);
    };

    recorder.start(250);
    raf = requestAnimationFrame(tick);
  });
}

export async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "speech");
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.text()) || "Transcription failed");
  return ((await res.json()) as { text: string }).text;
}

/** Strips markdown so TTS doesn't read out asterisks and URLs. */
export function speakable(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " (code omitted) ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

export class Speaker {
  private audio: HTMLAudioElement | null = null;
  private raf = 0;
  private finish: (() => void) | null = null;

  async play(text: string, voice: string, onLevel?: (level: number) => void): Promise<void> {
    this.stop();
    const clean = speakable(text);
    if (!clean) return;

    let blob: Blob;
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voice }),
      });
      if (!res.ok) throw new Error(await res.text());
      blob = await res.blob();
    } catch {
      return this.fallback(clean);
    }

    const ctx = audioContext();
    const audio = new Audio(URL.createObjectURL(blob));
    this.audio = audio;
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    const buf = new Float32Array(analyser.fftSize);

    await new Promise<void>((resolve) => {
      const done = () => {
        cancelAnimationFrame(this.raf);
        onLevel?.(0);
        source.disconnect();
        URL.revokeObjectURL(audio.src);
        this.finish = null;
        resolve();
      };
      this.finish = done;
      audio.onended = done;
      audio.onerror = done;
      const tick = () => {
        onLevel?.(Math.min(1, rms(analyser, buf) * 5));
        this.raf = requestAnimationFrame(tick);
      };
      audio.play().then(tick, done);
    });
  }

  private fallback(text: string) {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => resolve();
      u.onerror = () => resolve();
      this.finish = () => {
        speechSynthesis.cancel();
        resolve();
      };
      speechSynthesis.speak(u);
    });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.finish?.();
  }
}
