/**
 * Who built Nova. Sourced from Yusuf's resume and his portfolio's content files
 * (github.com/Yusuf-Hussain25/yusuf-portfolio, lib/content). Facts only — nothing invented.
 */
export const CREATOR = {
  name: "Yusuf Hussain",
  title: "AI Full-Stack Engineer",
  photo: "/yusuf/avatar.jpg",
  banner: "/yusuf/banner.jpg",
  awardPhoto: "/yusuf/award.jpg",
  location: "India",
  summary:
    "AI full-stack engineer who builds LLM products end to end: retrieval, agents and automation, the APIs and data behind them, and the interfaces people actually use. As project lead at Freedom With AI he has taken AI products from scratch to live production serving 30,000+ users.",
  award: {
    title: "Best Employee of the Year 2026",
    org: "Freedom With AI",
    why: "Recognised for treating client problems as his own — including the ones that broke at 2 AM — and for growing into responsibility as a project lead within a year.",
  },
  story:
    "Studied Computer Science at a tier-3 college in Patna with no placement pipeline and no financial cushion, so he taught himself what the syllabus didn't: 100+ LeetCode problems, DSA with Java and C++ certifications, hackathons. Hired as a Full Stack Developer in his final year (Aug 2024), moved into AI full-time at Freedom With AI (Dec 2025), and was named Best Employee of the Year 2026.",
  experience: [
    {
      org: "Freedom With AI",
      role: "AI Developer · Project Lead",
      period: "Dec 2025 — Present",
      points: [
        "Leads AI products from scratch to live production, now used by 30,000+ users — requirements, architecture, team coordination and release.",
        "Built n8n + LLM automation pipelines that replaced manual client workflows (notifications, reminders, planning, task management).",
        "Node.js and Python backends with REST APIs and PostgreSQL, with LLM streaming and prompt orchestration.",
        "Flutter mobile apps with embedded AI (chat, voice, document Q&A).",
        "Production on AWS with CI/CD and zero-downtime releases.",
      ],
    },
    {
      org: "KVL Business Solutions",
      role: "Full Stack Developer",
      period: "Aug 2024 — Sept 2025",
      points: [
        "AI-driven web apps on MERN + Next.js that automated internal workflows.",
        "Node.js/Express REST APIs handling 5,000+ daily transactions at sub-200ms p95.",
        "Dockerised services shipped via CI/CD to AWS.",
      ],
    },
  ],
  education: "B.Tech in Computer Science and Engineering, R.P. Sharma Institute of Technology, Patna (2021–2025), CGPA 8.5/10.",
  skills: {
    "AI / LLM": "OpenAI, Anthropic Claude, Google Gemini, LangChain, LangGraph, RAG, AI agents, n8n, AI SDK",
    "Vector DBs": "Pinecone, ChromaDB, pgvector, embeddings, semantic search",
    Languages: "TypeScript, JavaScript, Python, Java, C++, SQL",
    Frontend: "React, Next.js, Tailwind CSS, Flutter",
    Backend: "Node.js, Express, FastAPI, REST, WebSockets, SSE, JWT",
    Databases: "PostgreSQL, MongoDB, MySQL, Redis, SQLite",
    "Cloud / DevOps": "AWS (EC2, S3, Lambda, RDS, Bedrock), Vercel, Docker, CI/CD",
  },
  projects: [
    {
      name: "Nova",
      kind: "Own project · 2026",
      what: "This assistant. Voice-first AI with hands-free conversation, live web search, weather, exact maths and app actions, chat history on serverless Postgres, and an automatic Gemini fallback. Next.js 16, AI SDK 7, OpenAI, Neon.",
      url: null,
    },
    {
      name: "RepoMind",
      kind: "Own project · 2026",
      what: "Multi-agent system that analyses any GitHub repo — maps architecture, summarises modules, answers code questions. LangGraph orchestration, RAG over code with Pinecone, Redis + BullMQ, live agent progress in Next.js.",
      url: "https://repomind.yusufhussain.in",
    },
    {
      name: "LLM Automation Pipelines",
      kind: "Professional · Freedom With AI",
      what: "n8n + LLM pipelines and AI-enabled apps delivered as project lead, serving 30,000+ users.",
      url: null,
    },
    { name: "GrowthOS", kind: "Client product", what: "Five role-based AI agents that keep a sales pipeline moving outside working hours.", url: null },
    { name: "Super AI", kind: "Client product", what: "Self-training website chatbot that learns a site on its own and goes live from a one-line embed.", url: null },
    { name: "VidYT", kind: "Client product", what: "Pre-publish AI scoring that flags a weak hook, title or thumbnail before a video goes live.", url: null },
    { name: "Body Tracker", kind: "Client product", what: "In-browser face, hand and pose tracking (MediaPipe) that turns a webcam into live posture and attention scores.", url: null },
    { name: "AapKaPlot", kind: "Client product", what: "Map-first marketplace for verified plots, homes and commercial listings.", url: null },
    { name: "Restro OS", kind: "Client product", what: "Restaurant platform unifying ordering, billing, reservations and delivery-platform orders.", url: null },
  ],
  links: {
    portfolio: "https://yusufhussain.in",
    github: "https://github.com/Yusuf-Hussain25",
    linkedin: "https://www.linkedin.com/in/yusuf-hussain",
    email: "yusuf.aman00@gmail.com",
    whatsapp: "https://wa.me/918789657886",
  },
  openTo: "AI engineer / AI full-stack roles — remote or on-site.",
} as const;

export function creatorBrief() {
  const c = CREATOR;
  return `## Who built you
You were designed and built from scratch by **${c.name}**, ${c.title} (${c.location}). You are his project — not Amazon Nova, not an OpenAI or Google product. Under the hood you run on OpenAI models with Google Gemini as a backup, but the product, design and engineering are Yusuf's.

When anyone asks who made you, who owns you, or anything about Yusuf — his work, projects, skills, experience, story, how to hire or contact him — answer from the facts below, warmly and with genuine pride, and call the aboutCreator tool so his profile card appears. Never invent facts beyond these; if something isn't here, say so and point to his portfolio.

Summary: ${c.summary}
Award: ${c.award.title}, ${c.award.org}. ${c.award.why}
Story: ${c.story}
Experience:
${c.experience.map((e) => `- ${e.role}, ${e.org} (${e.period}): ${e.points.join(" ")}`).join("\n")}
Education: ${c.education}
Skills: ${Object.entries(c.skills)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ")}
Projects:
${c.projects.map((p) => `- ${p.name} (${p.kind}): ${p.what}${p.url ? ` Live: ${p.url}` : ""}`).join("\n")}
Client products' case studies are on his portfolio.
Open to: ${c.openTo}
Contact: portfolio ${c.links.portfolio} · email ${c.links.email} · LinkedIn ${c.links.linkedin} · GitHub ${c.links.github} · WhatsApp ${c.links.whatsapp}`;
}
