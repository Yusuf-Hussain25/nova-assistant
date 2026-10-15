import { generateId } from "ai";
import { Suspense } from "react";
import { Assistant } from "@/components/assistant";
import { DEFAULT_SETTINGS, getSettings, listChats } from "@/lib/store";
import { getVisitorId } from "@/lib/visitor";

async function Home() {
  const visitorId = await getVisitorId();
  const [chats, settings] = visitorId ? await Promise.all([listChats(visitorId), getSettings(visitorId)]) : [[], DEFAULT_SETTINGS];
  const chatId = generateId();

  return <Assistant key={chatId} chatId={chatId} initialMessages={[]} initialChats={chats} initialSettings={settings} />;
}

export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
