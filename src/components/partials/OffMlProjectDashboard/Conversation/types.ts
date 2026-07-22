import type { SupportCase } from "@/types/app/offMlProject";

export type ConversationMessage = SupportCase["conversation"][number];

export type ConversationFilter = "all" | "customer" | "bot" | "system" | "tech" | "ai";
export type ConversationSort = "oldest" | "newest";
export type ConversationViewMode = "CONVERSATION_ONLY" | "ALL_EVENTS";
export type ConversationRange = "all" | "today" | "7d" | "30d";
export type ConversationMessageType = "all" | "conversation" | "request_info" | "customer_reply" | "internal" | "system_event";
export type ConversationDeliveryStatus = "all" | "received" | "pending" | "sent" | "failed";

