import { Button, Group, Paper, Select, Switch, TextInput } from "@mantine/core";
import { AppIcon } from "@/components/common";
import type { ConversationDeliveryStatus, ConversationFilter, ConversationMessageType, ConversationSort } from "./types";

interface ConversationFiltersProps {
  deliveryStatus: ConversationDeliveryStatus;
  filter: ConversationFilter;
  hideSystemEvents: boolean;
  messageType: ConversationMessageType;
  onClear: () => void;
  onDeliveryStatusChange: (value: ConversationDeliveryStatus) => void;
  onFilterChange: (value: ConversationFilter) => void;
  onHideSystemEventsChange: (value: boolean) => void;
  onMessageTypeChange: (value: ConversationMessageType) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: ConversationSort) => void;
  search: string;
  sort: ConversationSort;
}

export function ConversationFilters({ deliveryStatus, filter, hideSystemEvents, messageType, onClear, onDeliveryStatusChange, onFilterChange, onHideSystemEventsChange, onMessageTypeChange, onSearchChange, onSortChange, search, sort }: ConversationFiltersProps) {
  const hasFilter = Boolean(search.trim()) || filter !== "all" || messageType !== "all" || deliveryStatus !== "all" || hideSystemEvents;
  return (
    <Paper className="caseConversationFilters" p="sm" radius="md" withBorder>
      <TextInput
        className="caseConversationSearch"
        leftSection={<AppIcon name="message" size={16} />}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        placeholder="ค้นหาข้อความ, เคส, ผู้ส่ง, ประเภท..."
        value={search}
      />
      <Select
        aria-label="ประเภทผู้ส่ง"
        data={[{ value: "all", label: "ผู้ส่ง: ทั้งหมด" }, { value: "customer", label: "ผู้ส่ง: ลูกค้า" }, { value: "bot", label: "ผู้ส่ง: LINE Bot" }, { value: "tech", label: "ผู้ส่ง: ทีม Tech" }, { value: "ai", label: "ผู้ส่ง: AI เรียบเรียง" }, { value: "system", label: "ผู้ส่ง: ระบบ" }]}
        onChange={(value) => onFilterChange((value as ConversationFilter | null) ?? "all")}
        size="sm"
        value={filter}
      />
      <Select
        aria-label="ประเภทข้อความ"
        data={[{ value: "all", label: "ประเภทข้อความ: ทั้งหมด" }, { value: "conversation", label: "ข้อความสนทนา" }, { value: "request_info", label: "ขอข้อมูลเพิ่ม" }, { value: "customer_reply", label: "คำตอบลูกค้า" }, { value: "internal", label: "ข้อความภายใน" }, { value: "system_event", label: "เหตุการณ์ระบบ" }]}
        onChange={(value) => onMessageTypeChange((value as ConversationMessageType | null) ?? "all")}
        size="sm"
        value={messageType}
      />
      <Select
        aria-label="สถานะการส่ง"
        data={[{ value: "all", label: "สถานะ: ทั้งหมด" }, { value: "received", label: "รับแล้ว" }, { value: "pending", label: "รอส่ง" }, { value: "sent", label: "ส่งแล้ว" }, { value: "failed", label: "ส่งไม่สำเร็จ" }]}
        onChange={(value) => onDeliveryStatusChange((value as ConversationDeliveryStatus | null) ?? "all")}
        size="sm"
        value={deliveryStatus}
      />
      <Select
        aria-label="การเรียงลำดับ"
        data={[{ value: "oldest", label: "เก่าสุดก่อน" }, { value: "newest", label: "ล่าสุดก่อน" }]}
        onChange={(value) => onSortChange((value as ConversationSort | null) ?? "oldest")}
        size="sm"
        value={sort}
      />
      <Group className="caseConversationFilterActions" gap="sm" wrap="nowrap">
        <Switch checked={hideSystemEvents} label="ซ่อนเหตุการณ์ระบบ" onChange={(event) => onHideSystemEventsChange(event.currentTarget.checked)} size="sm" />
        {hasFilter ? <Button onClick={onClear} size="compact-sm" variant="subtle">ล้างตัวกรอง</Button> : null}
      </Group>
    </Paper>
  );
}
