"use client";

import { Badge, Button, Group, Paper, Popover, Select, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { AppIcon } from "@/components/common";
import type { ConversationDeliveryStatus, ConversationFilter, ConversationMessageType, ConversationRange, ConversationSort, ConversationViewMode } from "./types";

interface ConversationFiltersProps {
  deliveryStatus: ConversationDeliveryStatus;
  filter: ConversationFilter;
  messageType: ConversationMessageType;
  onClear: () => void;
  onDeliveryStatusChange: (value: ConversationDeliveryStatus) => void;
  onFilterChange: (value: ConversationFilter) => void;
  onMessageTypeChange: (value: ConversationMessageType) => void;
  onRangeChange: (value: ConversationRange) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: ConversationSort) => void;
  onViewModeChange: (value: ConversationViewMode) => void;
  range: ConversationRange;
  search: string;
  sort: ConversationSort;
  viewMode: ConversationViewMode;
}

const messageTypeLabels: Record<ConversationMessageType, string> = {
  all: "ประเภทข้อความ: ทั้งหมด",
  conversation: "ข้อความสนทนา",
  request_info: "ขอข้อมูลเพิ่ม",
  customer_reply: "คำตอบผู้ใช้งาน",
  internal: "ข้อความภายใน",
  system_event: "เหตุการณ์ระบบ",
};

const deliveryStatusLabels: Record<ConversationDeliveryStatus, string> = {
  all: "สถานะข้อความ: ทั้งหมด",
  received: "รับแล้ว",
  pending: "รอส่ง",
  sent: "ส่งแล้ว",
  failed: "ส่งไม่สำเร็จ",
};

export function ConversationFilters({ deliveryStatus, filter, messageType, onClear, onDeliveryStatusChange, onFilterChange, onMessageTypeChange, onRangeChange, onSearchChange, onSortChange, onViewModeChange, range, search, sort, viewMode }: ConversationFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeCount = [filter !== "all", messageType !== "all", deliveryStatus !== "all", range !== "all", sort !== "oldest", viewMode !== "CONVERSATION_ONLY"].filter(Boolean).length;
  const hasAnyFilter = Boolean(search.trim()) || activeCount > 0;

  const activeChips = [
    search.trim() ? { key: "search", label: `ค้นหา: ${search.trim()}`, onRemove: () => onSearchChange("") } : null,
    filter !== "all" ? { key: "filter", label: `ผู้ส่ง: ${filter === "customer" ? "ผู้ใช้งาน" : filter === "bot" ? "LINE Bot" : filter === "tech" ? "ทีม Tech" : filter === "ai" ? "AI เรียบเรียง" : "ระบบ"}`, onRemove: () => onFilterChange("all") } : null,
    messageType !== "all" ? { key: "messageType", label: messageTypeLabels[messageType], onRemove: () => onMessageTypeChange("all") } : null,
    deliveryStatus !== "all" ? { key: "deliveryStatus", label: deliveryStatusLabels[deliveryStatus], onRemove: () => onDeliveryStatusChange("all") } : null,
    range !== "all" ? { key: "range", label: `ช่วงเวลา: ${range === "today" ? "วันนี้" : range === "7d" ? "7 วันที่ผ่านมา" : "30 วันที่ผ่านมา"}`, onRemove: () => onRangeChange("all") } : null,
  ].filter((chip): chip is { key: string; label: string; onRemove: () => void } => Boolean(chip));

  return (
    <Stack gap={6}>
      <Paper className="caseConversationFilters" p="xs" radius="md" withBorder>
        <TextInput
          className="caseConversationSearch"
          leftSection={<AppIcon name="message" size={16} />}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          placeholder="ค้นหาข้อความ เลขเคส ผู้ส่ง หรือประเภทข้อความ"
          value={search}
        />
        <Select
          aria-label="ประเภทข้อความ"
          data={Object.entries(messageTypeLabels).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onMessageTypeChange((value as ConversationMessageType | null) ?? "all")}
          size="sm"
          value={messageType}
        />
        <Popover onChange={setAdvancedOpen} opened={advancedOpen} position="bottom-end" shadow="sm" width={380} withArrow>
          <Popover.Target>
            <Button className="caseConversationAdvancedButton" leftSection={<AppIcon name="settings" size={15} />} onClick={() => setAdvancedOpen((opened) => !opened)} size="sm" variant="light">
              ตัวกรองเพิ่มเติม{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
              <Text fw={700} size="sm">ตัวกรองเพิ่มเติม</Text>
              <Select
                aria-label="ผู้ส่งข้อความ"
                data={[
                  { value: "all", label: "ผู้ส่ง: ทั้งหมด" },
                  { value: "customer", label: "ผู้ส่ง: ผู้ใช้งาน" },
                  { value: "bot", label: "ผู้ส่ง: LINE Bot" },
                  { value: "tech", label: "ผู้ส่ง: ทีม Tech" },
                  { value: "ai", label: "ผู้ส่ง: AI เรียบเรียง" },
                  { value: "system", label: "ผู้ส่ง: ระบบ" },
                ]}
                label="ผู้ส่งข้อความ"
                onChange={(value) => onFilterChange((value as ConversationFilter | null) ?? "all")}
                size="sm"
                value={filter}
              />
              <Select
                aria-label="ช่วงเวลาประวัติการสนทนา"
                data={[{ value: "all", label: "ทั้งหมด" }, { value: "today", label: "วันนี้" }, { value: "7d", label: "7 วันที่ผ่านมา" }, { value: "30d", label: "30 วันที่ผ่านมา" }]}
                label="ช่วงเวลา"
                onChange={(value) => onRangeChange((value as ConversationRange | null) ?? "all")}
                size="sm"
                value={range}
              />
              <Select
                aria-label="การเรียงลำดับข้อความ"
                data={[{ value: "oldest", label: "เก่าสุดก่อน" }, { value: "newest", label: "ใหม่สุดก่อน" }]}
                label="เรียงลำดับ"
                onChange={(value) => onSortChange((value as ConversationSort | null) ?? "oldest")}
                size="sm"
                value={sort}
              />
              <Select
                aria-label="มุมมองประวัติการสนทนา"
                data={[{ value: "CONVERSATION_ONLY", label: "เฉพาะบทสนทนา" }, { value: "ALL_EVENTS", label: "เหตุการณ์ทั้งหมด" }]}
                label="แสดงข้อมูล"
                onChange={(value) => onViewModeChange((value as ConversationViewMode | null) ?? "CONVERSATION_ONLY")}
                size="sm"
                value={viewMode}
              />
              <Select
                aria-label="สถานะข้อความ"
                data={Object.entries(deliveryStatusLabels).map(([value, label]) => ({ value, label }))}
                label="สถานะข้อความ"
                onChange={(value) => onDeliveryStatusChange((value as ConversationDeliveryStatus | null) ?? "all")}
                size="sm"
                value={deliveryStatus}
              />
              <Group justify="flex-end" gap="xs">
                <Button onClick={() => { onClear(); setAdvancedOpen(false); }} size="xs" variant="subtle">ล้างตัวกรอง</Button>
                <Button onClick={() => setAdvancedOpen(false)} size="xs">ใช้ตัวกรอง</Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Paper>

      {hasAnyFilter ? (
        <Group className="caseConversationFilterChips" gap={6} wrap="wrap">
          <Text c="dimmed" size="xs">ตัวกรองที่ใช้งานอยู่:</Text>
          {activeChips.map((chip) => <Badge className="caseConversationFilterChip" key={chip.key} rightSection={<button aria-label={`ลบ${chip.label}`} onClick={chip.onRemove} type="button">×</button>} variant="light">{chip.label}</Badge>)}
          <Button onClick={onClear} size="compact-xs" variant="subtle">ล้างทั้งหมด</Button>
        </Group>
      ) : null}
    </Stack>
  );
}
