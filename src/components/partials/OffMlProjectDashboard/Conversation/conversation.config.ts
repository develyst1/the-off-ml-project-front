import type { IconName } from "@/components/common/AppIcon";
import type { ConversationDeliveryStatus, ConversationFilter, ConversationMessage, ConversationMessageType } from "./types";

export interface ConversationMeta {
  filter: Exclude<ConversationFilter, "all"> | "other";
  label: string;
  actionLabel: string;
  color: "blue" | "green" | "gray" | "indigo" | "violet";
  accent: string;
  icon: IconName;
  isSystemEvent: boolean;
}

const messageTypeLabels: Record<string, string> = {
  CUSTOMER_MESSAGE: "ข้อความจากลูกค้า",
  CUSTOMER_ADDITIONAL_INFO: "ข้อมูลเพิ่มเติมจากลูกค้า",
  CASE_ACKNOWLEDGEMENT: "รับเรื่อง",
  REQUEST_MORE_INFO: "ขอข้อมูลเพิ่มเติม",
  TECH_RAW_REPLY: "ข้อความจากทีม Tech",
  TECH_REPLY: "ข้อความจากทีม Tech",
  AI_REWRITTEN_REPLY: "AI ช่วยเรียบเรียง",
  CUSTOMER_REWRITE: "AI ช่วยเรียบเรียง",
  CUSTOMER_REPLY: "ส่งให้ลูกค้า",
  INTERNAL_NOTE: "ข้อความภายใน",
  CASE_FORWARDED: "เหตุการณ์ระบบ",
  STATUS_UPDATE: "เหตุการณ์ระบบ",
  CASE_REOPENED: "เหตุการณ์ระบบ",
  CASE_CLOSED: "เหตุการณ์ระบบ",
  SYSTEM_EVENT: "เหตุการณ์ระบบ",
  RESOLUTION: "แนวทางแก้ไข",
  text: "ข้อความสนทนา",
  system: "เหตุการณ์ระบบ",
};

const metaByFilter: Record<Exclude<ConversationFilter, "all"> | "other", Omit<ConversationMeta, "actionLabel" | "isSystemEvent">> = {
  customer: { filter: "customer", label: "ลูกค้า", color: "blue", accent: "#228be6", icon: "message" },
  bot: { filter: "bot", label: "LINE Bot", color: "green", accent: "#2f9e44", icon: "brain" },
  system: { filter: "system", label: "ระบบ", color: "gray", accent: "#868e96", icon: "settings" },
  tech: { filter: "tech", label: "ทีม Tech", color: "indigo", accent: "#4263eb", icon: "message" },
  ai: { filter: "ai", label: "AI เรียบเรียง", color: "violet", accent: "#7950f2", icon: "brain" },
  other: { filter: "other", label: "อื่น ๆ", color: "gray", accent: "#868e96", icon: "message" },
};

function getMessageFilter(message: ConversationMessage): ConversationMeta["filter"] {
  if (message.senderType === "CUSTOMER") return "customer";
  if (message.senderType === "BOT") return "bot";
  if (message.senderType === "AI" || message.messageType === "CUSTOMER_REWRITE" || message.messageType === "AI_REWRITTEN_REPLY") return "ai";
  if (message.senderType === "TECH" || message.messageType === "TECH_REPLY" || message.messageType === "TECH_RAW_REPLY" || message.messageType === "INTERNAL_NOTE") return "tech";
  if (message.senderType === "SYSTEM" || message.channel === "system") return "system";
  return "other";
}

function isSystemEvent(message: ConversationMessage) {
  return message.senderType === "SYSTEM" || ["CASE_FORWARDED", "STATUS_UPDATE", "CASE_REOPENED", "CASE_CLOSED", "SYSTEM_EVENT"].includes(message.messageType ?? "");
}

function wasSentToCustomer(message: ConversationMessage) {
  if (message.direction !== "OUTBOUND") return false;
  if (message.isVisibleToCustomer === true) return true;
  return ["SENT", "API_ACCEPTED", "DELIVERED"].includes(message.deliveryStatus?.toUpperCase() ?? "");
}

export function isConversationMessage(message: ConversationMessage) {
  if (message.senderType === "CUSTOMER" || message.senderType === "TECH") return true;
  if (message.senderType === "BOT" || message.senderType === "AI") return wasSentToCustomer(message);
  return false;
}

export function getConversationMeta(message: ConversationMessage): ConversationMeta {
  const filter = getMessageFilter(message);
  return {
    ...metaByFilter[filter],
    actionLabel: messageTypeLabels[message.messageType ?? ""] ?? "ข้อความสนทนา",
    isSystemEvent: isSystemEvent(message),
  };
}

export function getConversationContent(message: ConversationMessage) {
  const raw = message.displayText?.trim() || message.originalText?.trim() || "ไม่มีเนื้อหาข้อความ";
  if (message.messageType === "CASE_FORWARDED") return "ส่งรายละเอียดเคสไปยัง Microsoft Teams แล้ว";
  if (message.messageType === "SYSTEM_EVENT" && /ข้อมูลล่าสุด|ข้อมูลเพิ่มเติม/.test(raw)) return "ส่งข้อมูลเพิ่มเติมให้ทีม Tech Support แล้ว";
  return raw;
}

export function getConversationStatus(message: ConversationMessage, meta = getConversationMeta(message)) {
  if (meta.isSystemEvent) return { label: "", color: "gray" as const, visible: false };
  if (message.messageType === "INTERNAL_NOTE") return { label: "ข้อความภายใน", color: "gray" as const, visible: true };

  const deliveryStatus = message.deliveryStatus?.toUpperCase();
  if (deliveryStatus === "FAILED") return { label: "ส่งไม่สำเร็จ", color: "red" as const, visible: true };
  if (deliveryStatus === "PENDING" || deliveryStatus === "PROCESSING") return { label: "รอส่ง", color: "yellow" as const, visible: true };
  if (deliveryStatus === "RECEIVED") return { label: "รับข้อความแล้ว", color: "blue" as const, visible: true };
  if (deliveryStatus === "PROCESSED") return { label: "ประมวลผลแล้ว", color: "blue" as const, visible: true };
  if (deliveryStatus === "SENT" || deliveryStatus === "API_ACCEPTED" || deliveryStatus === "DELIVERED") return { label: "ส่งแล้ว", color: "green" as const, visible: true };
  return { label: "บันทึกแล้ว", color: "gray" as const, visible: true };
}

export function matchesMessageType(message: ConversationMessage, filter: ConversationMessageType) {
  if (filter === "all") return true;
  if (filter === "conversation") return !getConversationMeta(message).isSystemEvent && message.messageType !== "REQUEST_MORE_INFO" && message.messageType !== "INTERNAL_NOTE";
  if (filter === "request_info") return message.messageType === "REQUEST_MORE_INFO";
  if (filter === "customer_reply") return message.messageType === "CUSTOMER_REPLY";
  if (filter === "internal") return message.messageType === "INTERNAL_NOTE" || message.direction === "INTERNAL";
  return getConversationMeta(message).isSystemEvent;
}

export function matchesDeliveryStatus(message: ConversationMessage, filter: ConversationDeliveryStatus) {
  if (filter === "all") return true;
  const status = message.deliveryStatus?.toUpperCase();
  if (filter === "received") return status === "RECEIVED" || status === "PROCESSED";
  if (filter === "pending") return status === "PENDING" || status === "PROCESSING";
  if (filter === "sent") return status === "SENT" || status === "API_ACCEPTED" || status === "DELIVERED";
  return status === "FAILED";
}

export function formatConversationDateTime(value?: string) {
  if (!value) return { date: "ไม่ทราบวันที่", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: "ข้อมูลเวลาไม่ถูกต้อง", time: "" };
  return {
    date: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(parsed),
    time: new Intl.DateTimeFormat("th-TH", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(parsed),
  };
}

export function conversationDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(value));
}

export function formatConversationDateLabel(value: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(value));
}
