import type { IconName } from "@/components/common/AppIcon";
import type { ConversationFilter, ConversationMessage } from "./types";

export interface ConversationMeta {
  filter: Exclude<ConversationFilter, "all"> | "other";
  label: string;
  actionLabel: string;
  color: "blue" | "green" | "gray" | "orange" | "violet";
  accent: string;
  icon: IconName;
}

const messageTypeLabels: Record<string, string> = {
  CASE_ACKNOWLEDGEMENT: "รับเรื่อง",
  REQUEST_MORE_INFO: "ขอข้อมูลเพิ่ม",
  CUSTOMER_ADDITIONAL_INFO: "ข้อมูลเพิ่มเติมจากลูกค้า",
  CASE_FORWARDED: "ส่งต่อ Teams",
  STATUS_UPDATE: "อัปเดตสถานะ",
  TECH_REPLY: "ข้อความจากทีม",
  TECH_RAW_REPLY: "ข้อความต้นฉบับจากทีม Tech",
  INTERNAL_NOTE: "ข้อความภายใน",
  CUSTOMER_REWRITE: "ข้อความที่ AI เรียบเรียง",
  AI_REWRITTEN_REPLY: "ข้อความที่ AI เรียบเรียง",
  CUSTOMER_REPLY: "ส่งให้ลูกค้า",
  RESOLUTION: "แนวทางแก้ไข",
  CASE_CLOSED: "ปิดเคส",
};

const metaByFilter: Record<Exclude<ConversationFilter, "all"> | "other", Omit<ConversationMeta, "actionLabel">> = {
  customer: { filter: "customer", label: "ลูกค้า", color: "blue", accent: "#228be6", icon: "message" },
  bot: { filter: "bot", label: "LINE BOT", color: "green", accent: "#2f9e44", icon: "brain" },
  system: { filter: "system", label: "ระบบ", color: "gray", accent: "#868e96", icon: "settings" },
  tech: { filter: "tech", label: "ทีม TECH SUPPORT", color: "orange", accent: "#f76707", icon: "alert" },
  ai: { filter: "ai", label: "AI เรียบเรียง", color: "violet", accent: "#7950f2", icon: "brain" },
  other: { filter: "other", label: "อื่น ๆ", color: "gray", accent: "#868e96", icon: "message" },
};

function getMessageFilter(message: ConversationMessage): ConversationMeta["filter"] {
  if (message.messageType === "CUSTOMER_REWRITE" || message.messageType === "AI_REWRITTEN_REPLY" || message.senderType === "AI") {
    return "ai";
  }
  if (message.senderType === "TECH" || message.messageType === "TECH_REPLY" || message.messageType === "TECH_RAW_REPLY" || message.messageType === "INTERNAL_NOTE") {
    return "tech";
  }
  if (message.senderType === "CUSTOMER") return "customer";
  if (message.senderType === "BOT") return "bot";
  if (message.senderType === "SYSTEM" || message.channel === "system") return "system";
  return "other";
}

export function getConversationMeta(message: ConversationMessage): ConversationMeta {
  const filter = getMessageFilter(message);
  return {
    ...metaByFilter[filter],
    actionLabel: message.messageType ? messageTypeLabels[message.messageType] ?? message.messageType : "ข้อความ",
  };
}

export function getConversationContent(message: ConversationMessage) {
  return message.displayText?.trim() || message.originalText?.trim() || "ไม่มีเนื้อหาข้อความ";
}

export function getConversationStatus(message: ConversationMessage, meta = getConversationMeta(message)) {
  const deliveryStatus = message.deliveryStatus?.toUpperCase();
  if (deliveryStatus === "FAILED") return { label: "ส่งไม่สำเร็จ", color: "red" as const };
  if (meta.filter === "ai") return { label: "เรียบเรียงแล้ว", color: "violet" as const };
  if (meta.filter === "system") return { label: "ระบบดำเนินการ", color: "gray" as const };
  if (deliveryStatus === "PENDING" || deliveryStatus === "PROCESSING") return { label: "กำลังดำเนินการ", color: "yellow" as const };
  if (deliveryStatus === "RECEIVED" || deliveryStatus === "PROCESSED") return { label: "ระบบดำเนินการ", color: "blue" as const };
  if (deliveryStatus === "SENT" || deliveryStatus === "API_ACCEPTED" || deliveryStatus === "DELIVERED") {
    return { label: "ส่งแล้ว", color: "green" as const };
  }
  return { label: "บันทึกแล้ว", color: "green" as const };
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

