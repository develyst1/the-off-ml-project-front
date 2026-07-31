"use client";

import { useEffect, useRef } from "react";
import { getRealtimeEventsUrl } from "@/services/offMlProject.service";

export type ConversationMessageCreatedEvent = {
  eventId: string;
  messageId: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND";
};

type UseRealtimeEventsOptions = {
  onConversationMessageCreated: (event: ConversationMessageCreatedEvent) => void;
  onReconnected: () => void;
};

export function useRealtimeEvents({ onConversationMessageCreated, onReconnected }: UseRealtimeEventsOptions) {
  const messageCreatedRef = useRef(onConversationMessageCreated);
  const reconnectedRef = useRef(onReconnected);

  useEffect(() => {
    messageCreatedRef.current = onConversationMessageCreated;
    reconnectedRef.current = onReconnected;
  }, [onConversationMessageCreated, onReconnected]);

  useEffect(() => {
    const source = new EventSource(getRealtimeEventsUrl());
    let hasOpened = false;
    const handleOpen = () => {
      if (hasOpened) reconnectedRef.current();
      hasOpened = true;
    };
    const handleMessageCreated = (event: MessageEvent<string>) => {
      try {
        messageCreatedRef.current(JSON.parse(event.data) as ConversationMessageCreatedEvent);
      } catch {
        // Ignore malformed events and retain the current Inbox data.
      }
    };
    source.addEventListener("open", handleOpen);
    source.addEventListener("conversation.message.created", handleMessageCreated);
    return () => {
      source.removeEventListener("open", handleOpen);
      source.removeEventListener("conversation.message.created", handleMessageCreated);
      source.close();
    };
  }, []);
}
