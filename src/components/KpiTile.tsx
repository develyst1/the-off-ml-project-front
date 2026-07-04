import { Group, Paper, Text } from "@mantine/core";
import type { ComponentType } from "react";

type TablerIcon = ComponentType<{ size?: string | number; stroke?: string | number }>;

export function KpiTile({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: TablerIcon;
  color: string;
  value: string | number;
  label: string;
}) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group wrap="nowrap">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `var(--mantine-color-${color}-1)`,
            color: `var(--mantine-color-${color}-7)`,
          }}
        >
          <Icon size={22} stroke={1.75} />
        </div>
        <div>
          <Text fw={800} size="xl" lh={1.1}>
            {value}
          </Text>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}
