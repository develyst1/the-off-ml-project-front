import { Badge, Box, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { AppIcon } from "@/components/common";
import { formatConversationDateTime, getConversationContent, getConversationMeta, getConversationStatus } from "./conversation.config";
import type { ConversationMessage } from "./types";

interface ConversationTimelineItemProps {
  isLast: boolean;
  message: ConversationMessage;
}

export function ConversationTimelineItem({ isLast, message }: ConversationTimelineItemProps) {
  const meta = getConversationMeta(message);
  const status = getConversationStatus(message, meta);
  const timestamp = formatConversationDateTime(message.createdAt);

  return (
    <Box className={`caseConversationTimelineItem ${meta.isSystemEvent ? "isSystemEvent" : ""}`}>
      <Box className="caseConversationTimelineRail">
        {!isLast ? <Box className="caseConversationTimelineLine" /> : null}
        <ThemeIcon color={meta.color} radius="xl" size={32} variant="filled">
          <AppIcon name={meta.icon} size={16} />
        </ThemeIcon>
      </Box>

      <Paper className={meta.isSystemEvent ? "caseConversationSystemRow" : "caseConversationTimelineCard"} p="xs" radius="md" style={{ borderLeftColor: meta.accent }} withBorder>
        <Group className="caseConversationTimelineHeader" gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="wrap">
            <Badge color={meta.color} variant="light">{meta.label}</Badge>
            <Text c="dimmed" size="xs">{meta.actionLabel}</Text>
          </Group>
          <Group className="caseConversationMessageMeta" gap="xs" wrap="nowrap">
            {status.visible ? <Group gap={5} wrap="nowrap"><Box className="caseConversationStatusDot" style={{ backgroundColor: `var(--mantine-color-${status.color}-6)` }} /><Text c={status.color} size="xs">{status.label}</Text></Group> : null}
            <Text className="caseConversationTimestamp" c="dimmed" size="xs" title={`${timestamp.date} ${timestamp.time}`}>{timestamp.time} น.</Text>
          </Group>
        </Group>
        <Text className="caseConversationMessageContent" mt={6} size="sm">{getConversationContent(message)}</Text>
      </Paper>
    </Box>
  );
}
