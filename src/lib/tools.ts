import { openai } from "@ai-sdk/openai";
import { tool, type InferUITools, type UIMessage } from "ai";
import { evaluate, format } from "mathjs";
import { z } from "zod";
import { CREATOR } from "./creator";

// WMO weather codes → short label. https://open-meteo.com/en/docs
const WMO: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
  85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Thunderstorm, hail",
};

type Weather = {
  place: string;
  current: { temp: number; feelsLike: number; humidity: number; wind: number; condition: string; code: number; isDay: boolean };
  days: { date: string; max: number; min: number; rain: number | null; condition: string; code: number }[];
};

const getJson = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(5000) }).then((r) => {
    if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`);
    return r.json();
  });

async function openMeteo(city: string): Promise<Weather | { error: string }> {
  const geo = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  const place = geo.results?.[0];
  if (!place) return { error: `Couldn't find a place called "${city}".` };

  const w = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=4`,
  );
  return {
    place: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    current: {
      temp: Math.round(w.current.temperature_2m),
      feelsLike: Math.round(w.current.apparent_temperature),
      humidity: w.current.relative_humidity_2m,
      wind: Math.round(w.current.wind_speed_10m),
      condition: WMO[w.current.weather_code] ?? "—",
      code: w.current.weather_code,
      isDay: w.current.is_day === 1,
    },
    days: (w.daily.time as string[]).map((date, i) => ({
      date,
      max: Math.round(w.daily.temperature_2m_max[i]),
      min: Math.round(w.daily.temperature_2m_min[i]),
      rain: w.daily.precipitation_probability_max[i],
      condition: WMO[w.daily.weather_code[i]] ?? "—",
      code: w.daily.weather_code[i],
    })),
  };
}

/** wttr.in uses WorldWeatherOnline codes; map them onto the WMO codes the UI draws. */
function wwoToWmo(code: number) {
  if (code === 113) return 0;
  if (code === 116) return 2;
  if (code === 119 || code === 122) return 3;
  if ([143, 149, 248, 260].includes(code)) return 45;
  if ([200, 386, 389, 392, 395].includes(code)) return 95;
  if ([179, 227, 230, 323, 326, 329, 332, 335, 338, 368, 371].includes(code)) return 73;
  if ([299, 302, 305, 308, 356, 359].includes(code)) return 63;
  return code >= 176 ? 61 : 3;
}

async function wttr(city: string): Promise<Weather> {
  const j = await getJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
  const c = j.current_condition[0];
  const area = j.nearest_area?.[0];
  const hour = new Date().getHours();
  return {
    place: [city.split(",")[0].trim(), area?.region?.[0]?.value, area?.country?.[0]?.value].filter(Boolean).join(", "),
    current: {
      temp: +c.temp_C,
      feelsLike: +c.FeelsLikeC,
      humidity: +c.humidity,
      wind: +c.windspeedKmph,
      condition: c.weatherDesc[0].value,
      code: wwoToWmo(+c.weatherCode),
      isDay: hour >= 6 && hour < 18,
    },
    days: (j.weather as { date: string; maxtempC: string; mintempC: string; hourly: { chanceofrain: string; weatherCode: string; weatherDesc: { value: string }[] }[] }[]).map(
      (d) => ({
        date: d.date,
        max: +d.maxtempC,
        min: +d.mintempC,
        rain: Math.max(...d.hourly.map((h) => +h.chanceofrain)),
        condition: d.hourly[4].weatherDesc[0].value,
        code: wwoToWmo(+d.hourly[4].weatherCode),
      }),
    ),
  };
}

const LINKS = {
  youtube: (q?: string) => (q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : "https://www.youtube.com"),
  google: (q?: string) => (q ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : "https://www.google.com"),
  maps: (q?: string) => (q ? `https://www.google.com/maps/search/${encodeURIComponent(q)}` : "https://www.google.com/maps"),
  spotify: (q?: string) => (q ? `https://open.spotify.com/search/${encodeURIComponent(q)}` : "https://open.spotify.com"),
  wikipedia: (q?: string) =>
    q ? `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` : "https://en.wikipedia.org",
  instagram: () => "https://www.instagram.com",
  facebook: () => "https://www.facebook.com",
  linkedin: () => "https://www.linkedin.com",
  github: (q?: string) => (q ? `https://github.com/search?q=${encodeURIComponent(q)}` : "https://github.com"),
  gmail: () => "https://mail.google.com",
} as const;

export const tools = {
  aboutCreator: tool({
    description:
      "Show the profile card of Yusuf Hussain, who built this assistant. Call it whenever the user asks who made/owns/created you, or asks about Yusuf, his projects, skills, experience or how to contact or hire him.",
    inputSchema: z.object({
      focus: z.enum(["overview", "projects", "experience", "contact"]).describe("What the user mainly wants to know"),
    }),
    execute: async ({ focus }) => ({
      focus,
      name: CREATOR.name,
      title: CREATOR.title,
      photo: CREATOR.photo,
      banner: CREATOR.banner,
      awardPhoto: CREATOR.awardPhoto,
      award: `${CREATOR.award.title} · ${CREATOR.award.org}`,
      highlights: ["30,000+ users served", "Project lead", "Best Employee 2026"],
      projects: CREATOR.projects.map(({ name, kind, url }) => ({ name, kind, url })),
      links: CREATOR.links,
    }),
  }),

  webSearch: openai.tools.webSearch({ searchContextSize: "medium" }),

  getWeather: tool({
    description:
      "Current weather and the next 3 days for a city. Use for any weather, temperature, rain or forecast question.",
    inputSchema: z.object({ city: z.string().describe("City name, e.g. 'Patna' or 'London, UK'") }),
    execute: async ({ city }) => {
      try {
        return await openMeteo(city);
      } catch {
        // Open-Meteo is free but occasionally unreachable; wttr.in is the backup.
        try {
          return await wttr(city);
        } catch {
          return { error: "Weather services are unreachable right now." };
        }
      }
    },
  }),

  calculate: tool({
    description:
      "Evaluate maths exactly: arithmetic, percentages, powers, trig, and unit conversions (e.g. '18% * 24999', '5 km to mi', 'sqrt(2)^10'). Always use this instead of mental maths.",
    inputSchema: z.object({ expression: z.string().describe("A mathjs expression") }),
    execute: async ({ expression }) => {
      try {
        const value = evaluate(expression.replace(/(\d),(\d)/g, "$1$2"));
        return { expression, result: format(value, { precision: 12 }) };
      } catch (e) {
        return { expression, error: (e as Error).message };
      }
    },
  }),

  openLink: tool({
    description:
      "Open a website or app for the user: play/search something on YouTube or Spotify, search Google, open Maps, Instagram, Facebook, LinkedIn, GitHub, Gmail, Wikipedia, or any URL.",
    inputSchema: z.object({
      target: z.enum([...(Object.keys(LINKS) as [keyof typeof LINKS]), "url"]),
      query: z.string().optional().describe("What to search for or play"),
      url: z.string().url().optional().describe("Only when target is 'url'"),
    }),
    execute: async ({ target, query, url }) => {
      const href = target === "url" ? url : LINKS[target](query);
      if (!href) return { error: "No URL given." };
      return { target, query: query ?? null, url: href };
    },
  }),
};

export type AssistantTools = InferUITools<typeof tools>;
export type AssistantMessage = UIMessage<never, never, AssistantTools>;
