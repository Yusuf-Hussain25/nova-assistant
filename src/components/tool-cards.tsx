"use client";

import type { ToolUIPart } from "ai";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { AssistantTools } from "@/lib/tools";
import { IconAlert, IconExternal, IconSearch, WeatherGlyph } from "./icons";

type Part<K extends keyof AssistantTools> = ToolUIPart<Pick<AssistantTools, K>>;

function Working({ children }: { children: React.ReactNode }) {
  return <div className="working py-1 text-[14px] font-medium">{children}</div>;
}

function Failed({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-[14px] text-muted">
      <IconAlert width={15} height={15} className="text-danger" /> {text}
    </div>
  );
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function pathLabel(url: string) {
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() ?? "";
    const words = decodeURIComponent(slug).replace(/\.(html?|php|aspx?)$/, "").replace(/[-_]+/g, " ").trim();
    return words.length > 3 && !/^\d+$/.test(words) ? words : u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SearchCard({ part }: { part: Part<"webSearch"> }) {
  if (part.state === "output-error") return <Failed text="Web search failed." />;
  if (part.state !== "output-available") return <Working>Searching the web…</Working>;

  const action = part.output.action;
  const query = action?.type === "search" ? (action.queries?.join(" · ") ?? action.query) : undefined;
  const seen = new Set<string>();
  const sources = (part.output.sources ?? [])
    .flatMap((s) => (s.type === "url" ? [s.url] : []))
    .filter((url) => !seen.has(url) && seen.add(url))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <IconSearch width={13} height={13} />
        Searched the web{query ? ` for “${query}”` : ""}
        {sources.length ? ` · ${sources.length} sources` : ""}
      </div>
      {sources.length ? (
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {sources.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="w-[190px] shrink-0 snap-start rounded-xl border border-line bg-surface p-3 transition-colors hover:border-faint"
            >
              <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://www.google.com/s2/favicons?domain=${host(url)}&sz=32`} alt="" width={14} height={14} className="rounded-sm" />
                <span className="truncate">{host(url)}</span>
              </div>
              <div className="mt-1.5 line-clamp-2 text-[13px] leading-snug font-medium capitalize">{pathLabel(url)}</div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const dayName = (iso: string, i: number) =>
  i === 0 ? "Today" : new Date(iso + "T12:00:00").toLocaleDateString("en", { weekday: "short" });

export function WeatherCard({ part }: { part: Part<"getWeather"> }) {
  if (part.state === "output-error") return <Failed text="Couldn't fetch the weather." />;
  if (part.state !== "output-available") return <Working>Checking the weather{part.input?.city ? ` in ${part.input.city}` : ""}…</Working>;

  const w = part.output;
  if ("error" in w) return <Failed text={w.error ?? "Couldn't fetch the weather."} />;

  return (
    <div className="max-w-[440px] rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted">{w.place}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{w.current.temp}°</span>
            <span className="text-[15px]">{w.current.condition}</span>
          </div>
        </div>
        <WeatherGlyph code={w.current.code} isDay={w.current.isDay} size={40} />
      </div>
      <div className="mt-3 flex gap-4 text-[12.5px] text-muted tabular-nums">
        <span>Feels {w.current.feelsLike}°</span>
        <span>Humidity {w.current.humidity}%</span>
        <span>Wind {w.current.wind} km/h</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1 border-t border-line pt-3">
        {w.days.map((d, i) => (
          <div key={d.date} className="flex flex-col items-center gap-1 text-[12.5px]">
            <span className="text-muted">{dayName(d.date, i)}</span>
            <WeatherGlyph code={d.code} size={20} />
            <span className="tabular-nums">
              {d.max}° <span className="text-faint">{d.min}°</span>
            </span>
            {d.rain ? <span className="text-[11px] text-muted tabular-nums">{d.rain}% rain</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalcCard({ part }: { part: Part<"calculate"> }) {
  if (part.state === "output-error") return <Failed text="Calculation failed." />;
  if (part.state !== "output-available") return <Working>Calculating…</Working>;
  const o = part.output;
  return (
    <div className="inline-flex max-w-full items-baseline gap-2 overflow-x-auto rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[13px]">
      <span className="text-muted">{o.expression}</span>
      <span className="text-faint">=</span>
      {"error" in o && o.error ? <span className="text-danger">{o.error}</span> : <span className="font-semibold">{o.result}</span>}
    </div>
  );
}

export function CreatorCard({ part }: { part: Part<"aboutCreator"> }) {
  if (part.state === "output-error") return null;
  if (part.state !== "output-available") return <Working>Pulling up my creator&apos;s profile…</Working>;
  const c = part.output;
  const projects = c.focus === "projects" ? c.projects : c.projects.slice(0, 3);
  const links = [
    { label: "Portfolio", href: c.links.portfolio, primary: true },
    { label: "LinkedIn", href: c.links.linkedin },
    { label: "GitHub", href: c.links.github },
    { label: "Email", href: `mailto:${c.links.email}` },
    { label: "WhatsApp", href: c.links.whatsapp },
  ];

  return (
    <div className="max-w-[560px] overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="relative h-[120px]">
        <Image src={c.banner} alt="" fill sizes="560px" className="object-cover object-[50%_30%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
      </div>
      <div className="relative -mt-12 px-5 pb-5">
        <div className="flex items-end gap-4">
          <Image
            src={c.photo}
            alt={c.name}
            width={88}
            height={88}
            className="size-[88px] rounded-2xl object-cover ring-4 ring-surface"
          />
          <div className="min-w-0 pb-1">
            <div className="text-[19px] font-semibold tracking-[-0.02em]">{c.name}</div>
            <div className="text-[13.5px] text-muted">{c.title}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-accent/25 bg-accent-soft p-2.5">
          <Image src={c.awardPhoto} alt="Best Employee of the Year trophy" width={36} height={48} className="h-12 w-9 rounded-md object-cover" />
          <div>
            <div className="text-[13.5px] font-semibold text-accent">{c.award.split(" · ")[0]}</div>
            <div className="text-[12px] text-muted">{c.award.split(" · ")[1]}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.highlights.map((h) => (
            <span key={h} className="rounded-full border border-line-strong px-2.5 py-1 text-[12px] text-ink/85">
              {h}
            </span>
          ))}
        </div>

        <ul className="mt-4 divide-y divide-line border-y border-line">
          {projects.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="text-[13.5px] font-medium">{p.name}</span>
                <span className="ml-2 text-[12px] text-faint">{p.kind}</span>
              </span>
              {p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-accent">
                  Live <IconExternal width={12} height={12} />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
        {projects.length < c.projects.length ? (
          <div className="mt-2 text-[12px] text-faint">+ {c.projects.length - projects.length} more on his portfolio</div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-[filter,border-color] ${
                l.primary ? "bg-accent text-accent-ink hover:brightness-105" : "border border-line-strong text-ink/85 hover:border-faint"
              }`}
            >
              {l.label}
              {l.primary ? <IconExternal width={13} height={13} /> : null}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  youtube: "YouTube",
  google: "Google",
  maps: "Google Maps",
  spotify: "Spotify",
  wikipedia: "Wikipedia",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  github: "GitHub",
  gmail: "Gmail",
};

export function LinkCard({ part, autoOpen }: { part: Part<"openLink">; autoOpen: boolean }) {
  const opened = useRef(false);
  const out = part.state === "output-available" ? part.output : null;
  const url = out && "url" in out ? out.url : undefined;

  useEffect(() => {
    if (autoOpen && url && !opened.current) {
      opened.current = true;
      window.open(url, "_blank", "noopener");
    }
  }, [autoOpen, url]);

  if (part.state === "output-error") return <Failed text="Couldn't open that." />;
  if (!out) return <Working>Opening…</Working>;
  if (!url) return <Failed text={("error" in out && out.error) || "Couldn't open that."} />;

  const target = "target" in out ? out.target : undefined;
  const label = (target && LABELS[target]) || host(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex max-w-full items-center gap-3 rounded-xl border border-line bg-surface py-2.5 pr-3 pl-3 transition-colors hover:border-faint"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://www.google.com/s2/favicons?domain=${host(url)}&sz=64`} alt="" width={22} height={22} className="rounded" />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium">{label}</span>
        {"query" in out && out.query ? <span className="block truncate text-[12.5px] text-muted">{out.query}</span> : null}
      </span>
      <IconExternal width={15} height={15} className="ml-2 text-muted group-hover:text-ink" />
    </a>
  );
}
