"use client";

import { useEffect, useRef, useState } from "react";
import type { AssistantSettings } from "@/lib/store";
import { VOICES } from "@/lib/voices";
import { IconX } from "./icons";

export function SettingsDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: AssistantSettings;
  onClose: () => void;
  onSaved: (s: AssistantSettings) => void;
}) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  // Two taps instead of a browser confirm() dialog.
  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setResetting(true);
    const res = await fetch("/api/session", { method: "DELETE" });
    if (!res.ok) {
      setResetting(false);
      return setError("Couldn't clear your history. Try again.");
    }
    // Full reload on purpose: drops all client state and picks up a fresh session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, assistantName: s.assistantName.trim() || "Nova" }),
    });
    setSaving(false);
    if (!res.ok) return setError("Couldn't save. Check the name (1–24 characters) and try again.");
    onSaved(await res.json());
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Assistant settings</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink">
            <IconX width={16} height={16} />
          </button>
        </div>

        <label className="mt-5 block text-[13px] font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          value={s.assistantName}
          maxLength={24}
          onChange={(e) => setS({ ...s, assistantName: e.target.value })}
          className="mt-1.5 h-10 w-full rounded-lg border border-line bg-bg px-3 text-[14.5px] outline-none focus:border-faint"
        />

        <fieldset className="mt-5">
          <legend className="text-[13px] font-medium">Model</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(
              [
                ["fast", "Fast", "GPT-6 Luna · best for voice"],
                ["smart", "Smart", "GPT-6.1 Sol · deeper answers"],
              ] as const
            ).map(([id, label, hint]) => (
              <label
                key={id}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${s.model === id ? "border-ink" : "border-line hover:border-faint"}`}
              >
                <input type="radio" name="model" value={id} checked={s.model === id} onChange={() => setS({ ...s, model: id })} className="sr-only" />
                <span className="block text-[14px] font-medium">{label}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[13px] font-medium">Voice</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {VOICES.map((v) => (
              <label
                key={v.id}
                className={`cursor-pointer rounded-lg border px-3 py-2 transition-colors ${s.voice === v.id ? "border-ink" : "border-line hover:border-faint"}`}
              >
                <input type="radio" name="voice" value={v.id} checked={s.voice === v.id} onChange={() => setS({ ...s, voice: v.id })} className="sr-only" />
                <span className="block text-[13.5px] font-medium">{v.label}</span>
                <span className="block text-[11.5px] text-muted">{v.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-line p-3">
          <div>
            <div className="text-[13.5px] font-medium">Clear history &amp; reset</div>
            <div className="text-[12px] text-muted">Deletes all your chats and settings on this browser, like logging out.</div>
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className={`h-9 shrink-0 rounded-lg px-3 text-[13px] font-medium transition-colors disabled:opacity-60 ${
              confirmReset ? "bg-danger text-white" : "border border-line-strong text-danger hover:border-danger"
            }`}
          >
            {resetting ? "Clearing…" : confirmReset ? "Tap again to confirm" : "Clear"}
          </button>
        </div>

        {error ? <p className="mt-4 text-[13px] text-danger">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-[14px] text-muted hover:text-ink">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="h-10 rounded-lg bg-ink px-4 text-[14px] font-medium text-bg disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
