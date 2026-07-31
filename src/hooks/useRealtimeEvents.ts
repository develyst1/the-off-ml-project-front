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
  onConnectionStateChange?: (connected: boolean) => void;
};

export function useRealtimeEvents({ onConnectionStateChange, onConversationMessageCreated, onReconnected }: UseRealtimeEventsOptions) {
  const messageCreatedRef = useRef(onConversationMessageCreated);
  const reconnectedRef = useRef(onReconnected);
  const connectionStateRef = useRef(onConnectionStateChange);

  useEffect(() => {
    messageCreatedRef.current = onConversationMessageCreated;
    reconnectedRef.current = onReconnected;
    connectionStateRef.current = onConnectionStateChange;
  }, [onConnectionStateChange, onConversationMessageCreated, onReconnected]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const realtimeUrl = getRealtimeEventsUrl();
    if (!realtimeUrl) {
      connectionStateRef.current?.(false);
      return;
    }

    let source: EventSource;
    try {
      source = new EventSource(realtimeUrl);
    } catch (error) {
      console.error("Off ML Project real-time connection could not start.", error);
      connectionStateRef.current?.(false);
      return;
    }

    let hasOpened = false;
    const handleOpen = () => {
      if (hasOpened) reconnectedRef.current();
      hasOpened = true;
      connectionStateRef.current?.(true);
    };
    const handleError = () => connectionStateRef.current?.(false);
    const handleMessageCreated = (event: MessageEvent<string>) => {
      try {
        messageCreatedRef.current(JSON.parse(event.data) as ConversationMessageCreatedEvent);
      } catch {
        // Ignore malformed events and retain the current Inbox data.
      }
    };
    source.addEventListener("open", handleOpen);
    source.addEventListener("error", handleError);
    source.addEventListener("conversation.message.created", handleMessageCreated);
    return () => {
      source.removeEventListener("open", handleOpen);
      source.removeEventListener("error", handleError);
      source.removeEventListener("conversation.message.created", handleMessageCreated);
      source.close();
    };
  }, []);
}
