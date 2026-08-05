"use client";

import { ActionIcon, Box, Group, Paper, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/common";
import { formatConversationDateTime } from "./conversation.config";
import type { ConversationFilter } from "./types";

interface ConversationSummaryProps {
  activeFilter: ConversationFilter;
  caseNumber: string;
  lastUpdatedAt?: string;
  counts: Record<"total" | "customer" | "bot" | "system" | "tech" | "ai", number>;
  onFilterChange: (filter: ConversationFilter) => void;
}

const countItems = [
  { key: "total", filter: "all", label: "รายการทั้งหมด", color: "blue", icon: "message" },
  { key: "customer", filter: "customer", label: "ผู้ใช้งาน", color: "blue", icon: "message" },
  { key: "bot", filter: "bot", label: "LINE Bot", color: "green", icon: "brain" },
  { key: "system", filter: "system", label: "ระบบ", color: "gray", icon: "settings" },
  { key: "tech", filter: "tech", label: "ทีม Tech", color: "indigo", icon: "message" },
  { key: "ai", filter: "ai", label: "AI เรียบเรียง", color: "violet", icon: "brain" },
] as const;

export function ConversationSummary({ activeFilter, caseNumber, lastUpdatedAt, counts, onFilterChange }: ConversationSummaryProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<number | undefined>(undefined);
  const lastUpdated = formatConversationDateTime(lastUpdatedAt);
  const hasLastUpdated = Boolean(lastUpdatedAt && !Number.isNaN(new Date(lastUpdatedAt).getTime()));

  useEffect(() => () => {
    if (copiedTimeout.current) window.clearTimeout(copiedTimeout.current);
  }, []);

  const copyCaseNumber = async () => {
    try {
      await navigator.clipboard.writeText(caseNumber);
      setCopied(true);
      if (copiedTimeout.current) window.clearTimeout(copiedTimeout.current);
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
              <ActionIcon aria-label="คัดลอกหมายเลขเคส" color={copied ? "green" : "gray"} onClick={() => void copyCaseNumber()} size="sm" variant="subtle">
                <AppIcon name={copied ? "check" : "copy"} size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Text c="dimmed" size="xs">อัปเดตล่าสุด: {hasLastUpdated ? `${lastUpdated.date} ${lastUpdated.time}` : "-"}</Text>
        </Stack>

        <Box aria-label="สรุปจำนวนข้อความ" className="caseConversationMetrics" role="tablist">
          {countItems.map((item) => (
            <UnstyledButton
              aria-selected={activeFilter === item.filter}
              aria-label={`${item.label} ${counts[item.key]} รายการ`}
              className={`caseConversationMetric ${activeFilter === item.filter ? "isActive" : ""}`}
              key={item.key}
              onClick={() => onFilterChange(item.filter as ConversationFilter)}
              role="tab"
              type="button"
            >
              <Group gap={6} wrap="nowrap">
                <ThemeIcon color={item.color} radius="md" size="sm" variant="light">
                  <AppIcon name={item.icon} size={15} />
                </ThemeIcon>
                <Stack className="caseConversationMetricText" gap={0} justify="center">
                  <Text c="dimmed" size="xs">{item.label.replace("รายการทั้งหมด", "ทั้งหมด")}</Text>
                  <Group gap={4} wrap="nowrap">
                    <Text className="caseConversationMetricCount" fw={800} size="sm">{counts[item.key]}</Text>
                    <Text c="dimmed" size="xs">รายการ</Text>
                  </Group>
                </Stack>
              </Group>
            </UnstyledButton>
          ))}
        </Box>
      </Box>
      {copied ? <Box className="caseConversationCopyToast" role="status">คัดลอกหมายเลขเคสแล้ว</Box> : null}
    </Paper>
  );
}
