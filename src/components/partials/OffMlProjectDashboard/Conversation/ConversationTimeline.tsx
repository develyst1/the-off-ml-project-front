import { Box, Button, Group, Select, SegmentedControl, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { ConversationEmptyState } from "./ConversationEmptyState";
import { conversationDateKey, formatConversationDateLabel } from "./conversation.config";
import { ConversationTimelineItem } from "./ConversationTimelineItem";
import type { ConversationMessage, ConversationSort, ConversationViewMode } from "./types";

interface ConversationTimelineProps {
  hasActiveFilters: boolean;
  isConversationOnly: boolean;
  latestMessageId?: string;
  messages: ConversationMessage[];
  onGoToLatest: () => void;
  onLoadMore: () => void;
  onSortChange: (value: ConversationSort) => void;
  onViewModeChange: (value: ConversationViewMode) => void;
  sort: ConversationSort;
  totalMatching: number;
  viewMode: ConversationViewMode;
}

export function ConversationTimeline({ hasActiveFilters, isConversationOnly, latestMessageId, messages, onGoToLatest, onLoadMore, onSortChange, onViewModeChange, sort, totalMatching, viewMode }: ConversationTimelineProps) {
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
      <Group gap="xs" wrap="wrap">
        <SegmentedControl
          aria-label="มุมมองประวัติการสนทนา"
          data={[{ label: "เฉพาะบทสนทนา", value: "CONVERSATION_ONLY" }, { label: "เหตุการณ์ทั้งหมด", value: "ALL_EVENTS" }]}
          onChange={(value) => onViewModeChange(value as ConversationViewMode)}
          size="xs"
          value={viewMode}
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

  if (totalMatching === 0) return <Stack gap="xs">{toolbar}<ConversationEmptyState kind={hasActiveFilters ? "search" : isConversationOnly ? "conversation" : "empty"} /></Stack>;

  const remainingCount = totalMatching - messages.length;
  const loadPreviousButton = remainingCount > 0 ? (
    <Button onClick={onLoadMore} size="sm" variant="subtle">
      โหลดข้อความก่อนหน้าอีก {Math.min(10, remainingCount)} รายการ
    </Button>
  ) : null;

  return (
    <Stack className="caseConversationTimeline" gap={6}>
      {toolbar}
      {sort === "oldest" ? loadPreviousButton : null}
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
      {sort === "newest" ? loadPreviousButton : null}
      {showGoToLatest && latestMessageId ? <Button className="caseConversationGoLatest" leftSection={<Text component="span">↓</Text>} onClick={onGoToLatest} size="xs" variant="light">ไปข้อความล่าสุด</Button> : null}
    </Stack>
  );
}
