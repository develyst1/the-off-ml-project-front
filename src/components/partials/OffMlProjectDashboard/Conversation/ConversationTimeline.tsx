import { Box, Button, Group, Select, SegmentedControl, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { conversationDateKey, formatConversationDateLabel } from "./conversation.config";
import { ConversationTimelineItem } from "./ConversationTimelineItem";
import type { ConversationMessage, ConversationSort } from "./types";

interface ConversationTimelineProps {
  hasActiveFilters: boolean;
  hideSystemEvents: boolean;
  latestMessageId?: string;
  messages: ConversationMessage[];
  onGoToLatest: () => void;
  onHideSystemEventsChange: (value: boolean) => void;
  onLoadMore: () => void;
  onSortChange: (value: ConversationSort) => void;
  sort: ConversationSort;
  totalMatching: number;
}

export function ConversationTimeline({ hasActiveFilters, hideSystemEvents, latestMessageId, messages, onGoToLatest, onHideSystemEventsChange, onLoadMore, onSortChange, sort, totalMatching }: ConversationTimelineProps) {
  const [showGoToLatest, setShowGoToLatest] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      setShowGoToLatest(Boolean(latestMessageId) && distanceFromBottom > 220);
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [latestMessageId, messages.length]);

  const toolbar = (
    <Group className="caseConversationTimelineToolbar" justify="space-between" gap="sm" wrap="wrap">
      <Text c="dimmed" size="sm"><Text component="span" fw={800} c="dark">{totalMatching}</Text> รายการ</Text>
      <Group gap="xs" wrap="wrap">
        <SegmentedControl
          aria-label="การแสดงเหตุการณ์ระบบ"
          data={[{ label: "ทั้งหมด", value: "all" }, { label: "เฉพาะบทสนทนา", value: "conversation" }]}
          onChange={(value) => onHideSystemEventsChange(value === "conversation")}
          size="xs"
          value={hideSystemEvents ? "conversation" : "all"}
        />
        <Select
          aria-label="เรียงลำดับข้อความ"
          className="caseConversationSort"
          data={[{ value: "oldest", label: "เก่าสุดก่อน" }, { value: "newest", label: "ใหม่สุดก่อน" }]}
          onChange={(value) => onSortChange((value as ConversationSort | null) ?? "oldest")}
          size="xs"
          value={sort}
        />
      </Group>
    </Group>
  );

  if (totalMatching === 0) return <Stack gap="xs">{toolbar}<ConversationEmptyState kind={hasActiveFilters ? "search" : "empty"} /></Stack>;

  return (
    <Stack className="caseConversationTimeline" gap={6}>
      {toolbar}
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const showDateSeparator = !previous || conversationDateKey(previous.createdAt) !== conversationDateKey(message.createdAt);
        return (
          <Box key={message.id}>
            {showDateSeparator ? <Text className="caseConversationDateSeparator" c="dimmed" size="xs">{formatConversationDateLabel(message.createdAt)}</Text> : null}
            <ConversationTimelineItem isLast={index === messages.length - 1} isLatest={message.id === latestMessageId} message={message} />
          </Box>
        );
      })}
      {messages.length < totalMatching ? <Button onClick={onLoadMore} size="sm" variant="subtle">แสดงเพิ่มเติม ({totalMatching - messages.length} รายการ)</Button> : null}
      {showGoToLatest && latestMessageId ? <Button className="caseConversationGoLatest" leftSection={<Text component="span">↓</Text>} onClick={onGoToLatest} size="xs" variant="light">ไปข้อความล่าสุด</Button> : null}
    </Stack>
  );
}
