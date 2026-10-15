import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Assistant } from "@/components/assistant";
import { getSettings, listChats, loadChat } from "@/lib/store";
import type { AssistantMessage } from "@/lib/tools";
import { getVisitorId } from "@/lib/visitor";

async function Chat({ params }: { params: PageProps<"/c/[id]">["params"] }) {
  const { id } = await params;
  const visitorId = await getVisitorId();
  if (!visitorId) redirect("/");

  const [messages, chats, settings] = await Promise.all([loadChat(id, visitorId), listChats(visitorId), getSettings(visitorId)]);
  if (messages === null) notFound();
  if (messages.length === 0) redirect("/");

  return (
    <Assistant
      key={id}
      chatId={id}
      initialMessages={messages as AssistantMessage[]}
      initialChats={chats}
      initialSettings={settings}
    />
  );
}

export default function ChatPage(props: PageProps<"/c/[id]">) {
  return (
    <Suspense>
      <Chat params={props.params} />
    </Suspense>
  );
}
