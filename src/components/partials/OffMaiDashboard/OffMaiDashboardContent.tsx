"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  NavLink,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { AppIcon } from "@/components/common";
import type { IconName } from "@/components/common/AppIcon";
import type { CaseStatus, SupportCase } from "@/types/app/offMai";
import {
  OFF_MAI_TABS,
  autoAnswerLogs,
  autoAnswerSolutions,
  confidenceSuggestions,
  supportCases,
} from "./OffMaiDashboard.config";

const statusMeta: Record<CaseStatus, { label: string; color: string }> = {
  awaiting_tech: { label: "รอทีมตอบใน Teams", color: "yellow" },
  awaiting_confirmation: { label: "รอยืนยัน AI แนะนำ", color: "blue" },
  resolved: { label: "ปิดเคสแล้ว", color: "green" },
  sent: { label: "ส่งคำตอบแล้ว", color: "green" },
  sla_breach: { label: "เกิน SLA", color: "red" },
};

function confidenceColor(value: number) {
  if (value >= 90) return "green";
  if (value >= 60) return "yellow";
  return "red";
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: IconName;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="metricCard" padding="lg" radius="md" withBorder>
      <Group gap="md" wrap="nowrap">
        <ThemeIcon color={color} radius="md" size={42} variant="light">
          <AppIcon name={icon} />
        </ThemeIcon>
        <Box>
          <Title order={2}>{value}</Title>
          <Text c="dimmed" size="sm">
            {label}
          </Text>
        </Box>
      </Group>
    </Card>
  );
}

function CaseInbox() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <MetricCard color="blue" icon="inbox" label="รอทีมตอบ" value="7" />
        <MetricCard color="yellow" icon="brain" label="รอยืนยัน AI แนะนำ" value="3" />
        <MetricCard color="green" icon="check" label="ปิดเคสแล้วเดือนนี้" value="128" />
        <MetricCard color="red" icon="alert" label="เกิน SLA" value="1" />
      </SimpleGrid>

      <Card padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Box>
            <Title order={3}>เคสล่าสุดจากลูกค้า LINE</Title>
            <Text c="dimmed" size="sm">
              ความมั่นใจในตารางอิงจาก analysis.confidence ของ API AI CENTER ตอนวิเคราะห์ข้อความลูกค้า
            </Text>
          </Box>
          <Badge color="gray" variant="light">
            SCR-001
          </Badge>
        </Group>

        <ScrollArea>
          <Table highlightOnHover miw={980} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ลูกค้า</Table.Th>
                <Table.Th>ข้อความต้นฉบับ</Table.Th>
                <Table.Th>หมวดหมู่</Table.Th>
                <Table.Th>ความมั่นใจจาก AI</Table.Th>
                <Table.Th>สถานะ</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {supportCases.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text fw={700}>{item.customerName}</Text>
                    <Text c="dimmed" size="xs">
                      {item.id}
                    </Text>
                  </Table.Td>
                  <Table.Td className="tableCellText">{item.originalText}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{item.category}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Progress
                        color={confidenceColor(item.aiConfidence)}
                        miw={72}
                        size="sm"
                        value={item.aiConfidence}
                      />
                      <Text fw={700} size="sm">
                        {item.aiConfidence}%
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={statusMeta[item.status].color} variant="light">
                      {statusMeta[item.status].label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button size="xs" variant="light">
                      เปิดเคส
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
}

function CaseDetail({ item }: { item: SupportCase }) {
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Box>
          <Title order={2}>
            {item.id} · {item.customerName}
          </Title>
          <Text c="dimmed">line_user_id: {item.lineUserId} · ส่งเมื่อ {item.createdAt}</Text>
        </Box>
        <Badge color={statusMeta[item.status].color} size="lg" variant="light">
          {statusMeta[item.status].label}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card padding="lg" radius="md" withBorder>
          <Title mb="sm" order={3}>
            1) ข้อความต้นฉบับจากลูกค้า
          </Title>
          <Paper bg="gray.0" p="md" radius="md">
            <Text className="compactText">{item.originalText}</Text>
          </Paper>
        </Card>

        <Card padding="lg" radius="md" withBorder>
          <Title mb="sm" order={3}>
            2) ผลวิเคราะห์โดย AI
          </Title>
          <Group mb="md">
            <Badge color="blue" variant="light">
              {item.category}
            </Badge>
            <Badge color={confidenceColor(item.aiConfidence)} variant="light">
              {item.aiConfidence}%
            </Badge>
          </Group>
          <Text className="compactText">{item.summary}</Text>
        </Card>
      </SimpleGrid>

      <Card padding="lg" radius="md" withBorder>
        <Title mb="md" order={3}>
          3) เธรดที่ส่งให้ทีม Tech Support ใน MS Teams
        </Title>
        <Stack className="timelineLine" gap="sm">
          {item.teamsThread.map((entry) => (
            <Paper bg="blue.0" key={entry} p="sm" radius="md">
              <Text size="sm">{entry}</Text>
            </Paper>
          ))}
        </Stack>
        <Divider my="md" />
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Box>
            <Text c="dimmed" fw={700} size="sm">
              วิธีแก้ที่สกัดได้
            </Text>
            <Text>{item.supportSolution ?? "รอทีม Tech Support ตอบกลับ"}</Text>
          </Box>
          <Box>
            <Text c="dimmed" fw={700} size="sm">
              ข้อความที่ส่งให้ลูกค้า
            </Text>
            <Text>{item.customerReply ?? "ยังไม่ส่งข้อความกลับลูกค้า"}</Text>
          </Box>
        </SimpleGrid>
      </Card>
    </Stack>
  );
}

function ConfidenceReview() {
  return (
    <Stack gap="lg">
      <Alert color="blue" icon={<AppIcon name="brain" />} radius="md" variant="light">
        ทีม Tech Support ใช้หน้านี้ตอบว่าเคสที่ AI แนะนำตรงกับ solution เดิมหรือไม่
        เพื่อเพิ่ม/ลดความมั่นใจในการเข้าใจเคสและการแยกแยะเคส
      </Alert>
      {confidenceSuggestions.map((item) => (
        <Card key={item.id} padding="lg" radius="md" withBorder>
          <Group align="flex-start" justify="space-between">
            <Box>
              <Title order={3}>{item.caseId} · {item.customerName}</Title>
              <Text c="dimmed" mt={4}>{item.originalText}</Text>
            </Box>
            <Badge color="blue" variant="light">{item.category}</Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
            <Paper bg="gray.0" p="md" radius="md">
              <Text c="dimmed" fw={700} size="sm">Solution ที่ AI แนะนำ</Text>
              <Text>{item.solutionText}</Text>
              <Text c="dimmed" mt="xs" size="xs">อ้างอิง {item.suggestedSolutionId}</Text>
            </Paper>
            <Stack gap="sm">
              <Box>
                <Group justify="space-between">
                  <Text size="sm">เข้าใจเคสถูกต้อง</Text>
                  <Text fw={700} size="sm">{item.caseUnderstandingConfidence}%</Text>
                </Group>
                <Progress value={item.caseUnderstandingConfidence} />
              </Box>
              <Box>
                <Group justify="space-between">
                  <Text size="sm">แยกเคส/เลือก solution ถูกต้อง</Text>
                  <Text fw={700} size="sm">{item.caseDiscriminationConfidence}%</Text>
                </Group>
                <Progress value={item.caseDiscriminationConfidence} />
              </Box>
            </Stack>
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Button color="red" variant="light">ไม่ใช่</Button>
            <Button>ใช่ ใช้วิธีนี้</Button>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}

function AnalyticsDashboard() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 4 }}>
        <MetricCard color="blue" icon="inbox" label="เคสทั้งหมดเดือนนี้" value="452" />
        <MetricCard color="green" icon="brain" label="แก้ได้จาก solution เดิม" value="61%" />
        <MetricCard color="red" icon="alert" label="เกิน SLA" value="8" />
        <MetricCard color="violet" icon="chart" label="พร้อม auto-answer" value="2" />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card padding="lg" radius="md" withBorder>
          <Title mb="md" order={3}>หมวดหมู่เคสที่พบบ่อย</Title>
          {[
            ["How-to", 38],
            ["Data Mismatch", 28],
            ["Login/Access", 21],
            ["Performance", 13],
          ].map(([label, value]) => (
            <Box key={label as string} mb="md">
              <Group justify="space-between">
                <Text>{label}</Text>
                <Text fw={700}>{value}%</Text>
              </Group>
              <Progress value={value as number} />
            </Box>
          ))}
        </Card>
        <Card padding="lg" radius="md" withBorder>
          <Title mb="md" order={3}>Confidence distribution</Title>
          {[
            ["0-59%", 18, "red"],
            ["60-89%", 31, "yellow"],
            ["90-97%", 29, "blue"],
            ["98-100%", 22, "green"],
          ].map(([label, value, color]) => (
            <Box key={label as string} mb="md">
              <Group justify="space-between">
                <Text>{label}</Text>
                <Text fw={700}>{value}%</Text>
              </Group>
              <Progress color={color as string} value={value as number} />
            </Box>
          ))}
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function AutomationSettings() {
  const [enabled, setEnabled] = useState(true);

  return (
    <Stack gap="lg">
      <Alert color="yellow" icon={<AppIcon name="settings" />} radius="md" variant="light">
        Auto-answer ทำงานได้เฉพาะเมื่อผ่านความมั่นใจ 2 ชั้น และทุกคำตอบต้องแจ้งทีมใน MS Teams เสมอ
      </Alert>

      <Card padding="lg" radius="md" withBorder>
        <Group justify="space-between">
          <Box>
            <Title order={3}>Guarded auto-answer</Title>
            <Text c="dimmed" size="sm">
              ใช้ threshold ทั้ง case_understanding_confidence และ case_discrimination_confidence
            </Text>
          </Box>
          <Switch
            checked={enabled}
            label={enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
            size="md"
          />
        </Group>
        <SimpleGrid cols={{ base: 1, md: 2 }} mt="lg">
          <Paper bg="gray.0" p="md" radius="md">
            <Text c="dimmed" fw={700} size="sm">เข้าใจเคสถูกต้อง</Text>
            <Title order={2}>98%</Title>
          </Paper>
          <Paper bg="gray.0" p="md" radius="md">
            <Text c="dimmed" fw={700} size="sm">แยกเคส/เลือก solution ถูกต้อง</Text>
            <Title order={2}>98%</Title>
          </Paper>
        </SimpleGrid>
        <Paper className="emergencyPanel" mt="lg" p="md" radius="md">
          <Flex align={{ base: "stretch", sm: "center" }} direction={{ base: "column", sm: "row" }} gap="md" justify="space-between">
            <Box>
              <Text c="red.8" fw={800}>หยุดการตอบอัตโนมัติ</Text>
              <Text c="dimmed" size="sm">
                ปิดทันทีและส่งเคสใหม่ทั้งหมดกลับเข้าคิวทีม Tech Support
              </Text>
            </Box>
            <Button color="red" leftSection={<AppIcon name="stop" />}>
              ปิดทันที
            </Button>
          </Flex>
        </Paper>
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Title mb="md" order={3}>Solution ที่ผ่าน guardrail</Title>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>หมวดหมู่</Table.Th>
              <Table.Th>เข้าใจเคส</Table.Th>
              <Table.Th>แยกเคส</Table.Th>
              <Table.Th>วิธีแก้</Table.Th>
              <Table.Th>สถานะ</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {autoAnswerSolutions.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.category}</Table.Td>
                <Table.Td>{item.caseUnderstandingConfidence}%</Table.Td>
                <Table.Td>{item.caseDiscriminationConfidence}%</Table.Td>
                <Table.Td>{item.solutionText}</Table.Td>
                <Table.Td><Badge color="green" variant="light">auto-answer ได้</Badge></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Title mb="md" order={3}>Auto-answer notification log</Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>เวลา</Table.Th>
              <Table.Th>ลูกค้า</Table.Th>
              <Table.Th>ข้อความที่ตอบ</Table.Th>
              <Table.Th>Solution</Table.Th>
              <Table.Th>Teams</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {autoAnswerLogs.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.time}</Table.Td>
                <Table.Td>{item.customer}</Table.Td>
                <Table.Td>{item.answerText}</Table.Td>
                <Table.Td>{item.solutionId}</Table.Td>
                <Table.Td>
                  <Badge color="green" variant="light">
                    แจ้งแล้ว
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}

export default function OffMaiDashboardContent() {
  const [activeTab, setActiveTab] = useState<string | null>("inbox");
  const selectedCase = useMemo(() => supportCases[0], []);

  return (
    <AppShell
      className="appShell"
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: "sm" }}
      padding={0}
    >
      <AppShell.Header className="header">
        <Group h="100%" justify="space-between" px="lg">
          <Group gap="md">
            <ThemeIcon color="blue" radius="md" size={40}>
              <AppIcon name="message" />
            </ThemeIcon>
            <Box>
              <Title order={3}>Off Mai Assistant</Title>
              <Text c="dimmed" size="xs">LINE intake · AI analysis · MS Teams support</Text>
            </Box>
          </Group>
          <Badge color="blue" variant="light">Tech Support Console</Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="sidebar" p="md">
        <Stack gap="xs">
          {OFF_MAI_TABS.map((tab) => {
            const icon: IconName =
              tab.value === "inbox"
                ? "inbox"
                : tab.value === "detail"
                  ? "message"
                  : tab.value === "confidence"
                    ? "check"
                    : tab.value === "analytics"
                      ? "chart"
                      : "settings";
            return (
              <NavLink
                active={activeTab === tab.value}
                key={tab.value}
                label={tab.label}
                leftSection={<AppIcon name={icon} />}
                onClick={() => setActiveTab(tab.value)}
                variant="light"
              />
            );
          })}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box className="content">
          <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
            <Tabs.Panel value="inbox">
              <CaseInbox />
            </Tabs.Panel>
            <Tabs.Panel value="detail">
              <CaseDetail item={selectedCase} />
            </Tabs.Panel>
            <Tabs.Panel value="confidence">
              <ConfidenceReview />
            </Tabs.Panel>
            <Tabs.Panel value="analytics">
              <AnalyticsDashboard />
            </Tabs.Panel>
            <Tabs.Panel value="automation">
              <AutomationSettings />
            </Tabs.Panel>
          </Tabs>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
