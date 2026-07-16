import { Button, Group, Paper, Select, TextInput } from "@mantine/core";
import { AppIcon } from "@/components/common";
import type { ConversationFilter, ConversationSort } from "./types";

interface ConversationFiltersProps {
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: ConversationSort) => void;
  search: string;
  sort: ConversationSort;
}

const filters: { value: ConversationFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "customer", label: "ลูกค้า" },
  { value: "bot", label: "บอท (LINE)" },
  { value: "system", label: "ระบบ" },
  { value: "tech", label: "ทีม Tech" },
  { value: "ai", label: "AI เรียบเรียง" },
];

export function ConversationFilters({ filter, onFilterChange, onSearchChange, onSortChange, search, sort }: ConversationFiltersProps) {
  return (
    <Paper className="caseConversationFilters" p="sm" radius="md" withBorder>
      <TextInput
        className="caseConversationSearch"
        leftSection={<AppIcon name="message" size={16} />}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        placeholder="ค้นหาข้อความ, เคส, เนื้อหา..."
        value={search}
      />
      <Group className="caseConversationFilterChips" gap="xs" wrap="wrap">
        {filters.map((option) => (
          <Button
            aria-pressed={filter === option.value}
            color={filter === option.value ? "dark" : "gray"}
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            size="compact-sm"
            variant={filter === option.value ? "filled" : "light"}
          >
            {option.label}
          </Button>
        ))}
      </Group>
      <Select
        aria-label="จัดการการแสดงผล"
        className="caseConversationSort"
        data={[
          { value: "oldest", label: "จัดการการแสดงผล: เก่า → ใหม่" },
          { value: "newest", label: "จัดการการแสดงผล: ใหม่ → เก่า" },
        ]}
        onChange={(value) => onSortChange((value as ConversationSort | null) ?? "oldest")}
        size="sm"
        value={sort}
      />
    </Paper>
  );
}

