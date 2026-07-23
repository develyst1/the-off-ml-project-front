import { Badge, Box, Button, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { useState } from "react";
import { AppIcon } from "@/components/common";
import { formatConversationDateTime, getConversationContent, getConversationMeta, getConversationStatus } from "./conversation.config";
import type { ConversationMessage } from "./types";

interface ConversationTimelineItemProps {
  isGroupedWithPrevious?: boolean;
  isLatest?: boolean;
  isLast: boolean;
  message: ConversationMessage;
}

export function ConversationTimelineItem({ isGroupedWithPrevious = false, isLast, isLatest = false, message }: ConversationTimelineItemProps) {
  const meta = getConversationMeta(message);
  const status = getConversationStatus(message, meta);
  const timestamp = formatConversationDateTime(message.createdAt);
  const content = getConversationContent(message);
  const [expanded, setExpanded] = useState(false);
  const isLongMessage = content.length > 220;

  return (
    <Box className={`caseConversationTimelineItem ${meta.isSystemEvent ? "isSystemEvent" : ""} ${isLatest ? "isLatest" : ""} ${isGroupedWithPrevious ? "isGrouped" : ""}`} id={`case-conversation-message-${message.id}`}>
      <Box className="caseConversationTimelineRail">
        {!isLast ? <Box className="caseConversationTimelineLine" /> : null}
        <ThemeIcon color={meta.color} radius="xl" size={32} variant="filled">
          <AppIcon name={meta.icon} size={16} />
        </ThemeIcon>
      </Box>

      <Paper className={meta.isSystemEvent ? "caseConversationSystemRow" : "caseConversationTimelineCard"} p="xs" radius="md" style={{ borderLeftColor: meta.accent }} withBorder>
        <Group className="caseConversationTimelineHeader" gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="wrap">
            {!isGroupedWithPrevious ? <Badge color={meta.color} variant="light">{meta.label}</Badge> : null}
            {isLatest ? <Badge color="blue" variant="filled">ล่าสุด</Badge> : null}
            {!isGroupedWithPrevious ? <Text c="dimmed" size="xs">{meta.actionLabel}</Text> : null}
          </Group>
          <Group className="caseConversationMessageMeta" gap="xs" wrap="nowrap">
            {status.visible ? <Group gap={5} wrap="nowrap"><Box className="caseConversationStatusDot" style={{ backgroundColor: `var(--mantine-color-${status.color}-6)` }} /><Text c={status.color} size="xs">{status.label}</Text></Group> : null}
            <Text className="caseConversationTimestamp" c="dimmed" size="xs" title={`${timestamp.date} ${timestamp.time}`}>{timestamp.time} น.</Text>
          </Group>
        </Group>
        <Text className="caseConversationMessageContent" lineClamp={expanded ? undefined : 3} mt={6} size="sm">{content}</Text>
        {isLongMessage ? <Button onClick={() => setExpanded((current) => !current)} px={0} size="compact-xs" variant="subtle">{expanded ? "ย่อข้อความ" : "ดูเพิ่มเติม"}</Button> : null}
      </Paper>
    </Box>
  );
}
