"use client";

import { useEffect, useRef } from "react";
import { getRealtimeEventsUrl } from "@/services/offMlProject.service";

export type ConversationMessageCreatedEvent = {
  eventId: string;
  messageId: string;
  conversationId: string;
  userId: string;
  caseId?: string;
  senderType?: "CUSTOMER" | "TECH" | "BOT" | "SYSTEM";
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND";
};

export type CaseAnalysisUpdatedEvent = {
  eventId: string;
  caseId: string;
  analysisId: string;
  analysisVersion: number;
  createdAt: string;
};

type UseRealtimeEventsOptions = {
  onConversationMessageCreated: (event: ConversationMessageCreatedEvent) => void;
  onCaseAnalysisUpdated?: (event: CaseAnalysisUpdatedEvent) => void;
  onReconnected: () => void;
  onConnectionStateChange?: (connected: boolean) => void;
};

export function useRealtimeEvents({ onCaseAnalysisUpdated, onConnectionStateChange, onConversationMessageCreated, onReconnected }: UseRealtimeEventsOptions) {
  const messageCreatedRef = useRef(onConversationMessageCreated);
  const analysisUpdatedRef = useRef(onCaseAnalysisUpdated);
  const reconnectedRef = useRef(onReconnected);
  const connectionStateRef = useRef(onConnectionStateChange);

  useEffect(() => {
    messageCreatedRef.current = onConversationMessageCreated;
    analysisUpdatedRef.current = onCaseAnalysisUpdated;
    reconnectedRef.current = onReconnected;
    connectionStateRef.current = onConnectionStateChange;
  }, [onCaseAnalysisUpdated, onConnectionStateChange, onConversationMessageCreated, onReconnected]);

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
    let reconnectGraceTimer: number | undefined;
    const clearReconnectGraceTimer = () => {
      if (reconnectGraceTimer) window.clearTimeout(reconnectGraceTimer);
      reconnectGraceTimer = undefined;
    };
    const handleOpen = () => {
      if (hasOpened) reconnectedRef.current();
      hasOpened = true;
      clearReconnectGraceTimer();
      connectionStateRef.current?.(true);
    };
    const handleError = () => {
      // Native EventSource already retries while CONNECTING. Only enable fallback if
      // it stays unavailable beyond a short grace period or is explicitly closed.
      if (source.readyState === EventSource.CLOSED) {
        connectionStateRef.current?.(false);
        return;
      }
      clearReconnectGraceTimer();
      reconnectGraceTimer = window.setTimeout(() => connectionStateRef.current?.(false), 15_000);
    };
    const handleMessageCreated = (event: MessageEvent<string>) => {
      try {
        messageCreatedRef.current(JSON.parse(event.data) as ConversationMessageCreatedEvent);
      } catch {
        // Ignore malformed events and retain the current Inbox data.
      }
    };
    const handleAnalysisUpdated = (event: MessageEvent<string>) => {
      try {
        analysisUpdatedRef.current?.(JSON.parse(event.data) as CaseAnalysisUpdatedEvent);
      } catch {
        // Ignore malformed events and retain the current Case Detail data.
      }
    };
    source.addEventListener("open", handleOpen);
    source.addEventListener("error", handleError);
    source.addEventListener("conversation.message.created", handleMessageCreated);
    source.addEventListener("case.analysis.updated", handleAnalysisUpdated);
    return () => {
      source.removeEventListener("open", handleOpen);
      source.removeEventListener("error", handleError);
      source.removeEventListener("conversation.message.created", handleMessageCreated);
      source.removeEventListener("case.analysis.updated", handleAnalysisUpdated);
      clearReconnectGraceTimer();
      source.close();
    };
  }, []);
}
