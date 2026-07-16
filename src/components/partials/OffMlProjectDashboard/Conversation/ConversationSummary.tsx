"use client";

import { ActionIcon, Box, Group, Paper, Select, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/common";
import { formatConversationDateTime } from "./conversation.config";
import type { ConversationRange } from "./types";

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
  const copiedTimeout = useRef<number | undefined>(undefined);
  const lastUpdated = formatConversationDateTime(lastUpdatedAt);
  const hasLastUpdated = Boolean(lastUpdatedAt && !Number.isNaN(new Date(lastUpdatedAt).getTime()));

  useEffect(() => {
    return () => {
      if (copiedTimeout.current) {
        window.clearTimeout(copiedTimeout.current);
      }
    };
  }, []);

  const copyCaseNumber = async () => {
    try {
      await navigator.clipboard.writeText(caseNumber);
      setCopied(true);
      if (copiedTimeout.current) {
        window.clearTimeout(copiedTimeout.current);
      }
      copiedTimeout.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Paper className="caseConversationSummary" p={0} radius="md" withBorder>
      <Box className="caseConversationSummaryLayout">
        <Stack className="caseConversationCaseIdentity" gap={1} justify="center">
          <Text c="dimmed" fw={700} size="xs">หมายเลขเคส</Text>
          <Group gap={6} wrap="nowrap">
            <Text className="caseConversationCaseNumber" fw={800}>{caseNumber}</Text>
            <Tooltip label="คัดลอกหมายเลขเคส" withArrow>
              <ActionIcon
                aria-label="คัดลอกหมายเลขเคส"
                color={copied ? "green" : "gray"}
                onClick={() => void copyCaseNumber()}
                size="sm"
                variant="subtle"
              >
                <AppIcon name={copied ? "check" : "copy"} size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Text c="dimmed" size="xs">
            อัปเดตล่าสุด: {hasLastUpdated ? `${lastUpdated.date} ${lastUpdated.time}` : "-"}
          </Text>
        </Stack>

        <Box className="caseConversationMetrics">
          {countItems.map((item) => (
            <Group className="caseConversationMetric" gap={6} key={item.key} wrap="nowrap">
              <ThemeIcon color={item.color} radius="md" size="md" variant="light">
                <AppIcon name={item.icon} size={15} />
              </ThemeIcon>
              <Stack gap={0} justify="center">
                <Text c="dimmed" size="xs">{item.label}</Text>
                <Group gap={4} wrap="nowrap">
                  <Text className="caseConversationMetricCount" fw={800} size="lg">{counts[item.key]}</Text>
                  <Text c="dimmed" size="xs">รายการ</Text>
                </Group>
              </Stack>
            </Group>
          ))}
        </Box>

        <Select
          aria-label="ช่วงเวลาประวัติการสนทนา"
          className="caseConversationRange"
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
      </Box>
      {copied ? <Box className="caseConversationCopyToast" role="status">คัดลอกหมายเลขเคสแล้ว</Box> : null}
    </Paper>
  );
}
