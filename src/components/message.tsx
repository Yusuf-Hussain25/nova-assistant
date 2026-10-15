"use client";

import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AssistantMessage } from "@/lib/tools";
import { IconCheck, IconCopy, IconRefresh, IconSpeaker, IconStop } from "./icons";
import { CalcCard, CreatorCard, LinkCard, SearchCard, WeatherCard } from "./tool-cards";

const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

export function messageText(m: AssistantMessage) {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim();
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink"
    >
      {children}
    </button>
  );
}

export function Message({
  message,
  streaming,
  isLast,
  fresh,
  speaking,
  onSpeak,
  onRegenerate,
}: {
  message: AssistantMessage;
  streaming: boolean;
  isLast: boolean;
  /** Arrived in this session (not loaded from history): allowed to auto-open links. */
  fresh: boolean;
  speaking: boolean;
  onSpeak: () => void;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-raised px-4 py-2.5 text-[15.5px] leading-relaxed whitespace-pre-wrap">
          {messageText(message)}
        </div>
      </div>
    );
  }

  const lastTextIndex = message.parts.findLastIndex((p) => p.type === "text");
  const hasText = lastTextIndex >= 0;

  return (
    <div className="group/msg space-y-3">
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        switch (part.type) {
          case "text":
            return (
              <div key={key} className={`md ${streaming && i === lastTextIndex ? "caret" : ""}`}>
                <Markdown text={part.text} />
              </div>
            );
          case "tool-aboutCreator":
            return <CreatorCard key={key} part={part} />;
          case "tool-webSearch":
            return <SearchCard key={key} part={part} />;
          case "tool-getWeather":
            return <WeatherCard key={key} part={part} />;
          case "tool-calculate":
            return <CalcCard key={key} part={part} />;
          case "tool-openLink":
            return <LinkCard key={key} part={part} autoOpen={fresh} />;
          default:
            return null;
        }
      })}

      {streaming && !hasText && message.parts.every((p) => p.type === "step-start") ? (
        <div className="working text-[14px] font-medium">Thinking…</div>
      ) : null}

      {!streaming && hasText ? (
        <div className="-ml-2 flex gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover/msg:opacity-100 md:focus-within:opacity-100">
          <ActionButton
            label={copied ? "Copied" : "Copy"}
            onClick={() => {
              void navigator.clipboard.writeText(messageText(message));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <IconCheck width={16} height={16} /> : <IconCopy width={16} height={16} />}
          </ActionButton>
          <ActionButton label={speaking ? "Stop reading" : "Read aloud"} onClick={onSpeak}>
            {speaking ? <IconStop width={14} height={14} /> : <IconSpeaker width={16} height={16} />}
          </ActionButton>
          {isLast ? (
            <ActionButton label="Regenerate" onClick={onRegenerate}>
              <IconRefresh width={16} height={16} />
            </ActionButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
