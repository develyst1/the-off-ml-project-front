"use client";

import { Box, Button, Group, Paper, Select, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { useState } from "react";
import { AppIcon } from "@/components/common";
import type { ConversationRange } from "./types";
import { formatConversationDateTime } from "./conversation.config";

interface ConversationSummaryProps {
  caseNumber: string;
  lastUpdatedAt?: string;
  counts: Record<"total" | "customer" | "bot" | "system" | "tech" | "ai", number>;
  range: ConversationRange;
  onRangeChange: (range: ConversationRange) => void;
}

const countItems = [
  { key: "total", label: "ข้อความทั้งหมด", color: "blue", icon: "message" },
  { key: "customer", label: "จากลูกค้า", color: "blue", icon: "message" },
  { key: "bot", label: "จากบอท (LINE)", color: "green", icon: "brain" },
  { key: "system", label: "โดยระบบ", color: "gray", icon: "settings" },
  { key: "tech", label: "โดยทีม Tech", color: "orange", icon: "alert" },
  { key: "ai", label: "จาก AI เรียบเรียง", color: "violet", icon: "brain" },
] as const;

export function ConversationSummary({ caseNumber, lastUpdatedAt, counts, range, onRangeChange }: ConversationSummaryProps) {
  const [copied, setCopied] = useState(false);
  const lastUpdated = formatConversationDateTime(lastUpdatedAt);

  const copyCaseNumber = async () => {
    try {
      await navigator.clipboard.writeText(caseNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Paper className="caseConversationSummary" p="md" radius="md" withBorder>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4, xl: 8 }} spacing="md" verticalSpacing="md">
        <Stack gap={2} justify="center">
          <Text c="dimmed" fw={700} size="xs">หมายเลขเคส</Text>
          <Group gap="xs" wrap="nowrap">
            <Text fw={800}>{caseNumber}</Text>
            <Button aria-label="คัดลอกหมายเลขเคส" onClick={() => void copyCaseNumber()} size="compact-xs" variant="subtle">
              {copied ? "คัดลอกแล้ว" : "คัดลอก"}
            </Button>
          </Group>
          <Text c="dimmed" size="xs">อัปเดตล่าสุด: {lastUpdated.date} {lastUpdated.time}</Text>
        </Stack>

        {countItems.map((item) => (
          <Group className="caseConversationMetric" gap="xs" key={item.key} wrap="nowrap">
            <ThemeIcon color={item.color} radius="md" size="md" variant="light">
              <AppIcon name={item.icon} size={15} />
            </ThemeIcon>
            <Box>
              <Text c="dimmed" size="xs">{item.label}</Text>
              <Text fw={800} size="lg">{counts[item.key]}</Text>
            </Box>
          </Group>
        ))}

        <Select
          aria-label="ช่วงเวลาประวัติการสนทนา"
          data={[
            { value: "all", label: "ช่วงเวลา: ทั้งหมด" },
            { value: "today", label: "วันนี้" },
            { value: "7d", label: "7 วันที่ผ่านมา" },
            { value: "30d", label: "30 วันที่ผ่านมา" },
          ]}
          onChange={(value) => onRangeChange((value as ConversationRange | null) ?? "all")}
          size="sm"
          value={range}
        />
      </SimpleGrid>
    </Paper>
  );
}

