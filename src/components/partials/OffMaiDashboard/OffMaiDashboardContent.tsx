"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
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
  awaiting_tech: { label: "รอทีม Tech Support ตอบกลับ", color: "yellow" },
  awaiting_confirmation: { label: "รอยืนยัน AI แนะนำ", color: "blue" },
  resolved: { label: "ปิดเคสแล้ว", color: "green" },
  sent: { label: "ส่งคำตอบแล้ว", color: "green" },
  sla_breach: { label: "เกิน SLA", color: "red" },
};

const WAITING_TECH_STATUS = "รอทีม Tech Support ตอบกลับ";

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

function OperationStepper() {
  const steps = [
    { label: "ส่งเคสเข้า Microsoft Teams แล้ว", state: "done" },
    { label: WAITING_TECH_STATUS, state: "current" },
    { label: "AI วิเคราะห์คำตอบจากทีม", state: "todo" },
    { label: "ส่งคำตอบกลับลูกค้า", state: "todo" },
  ] as const;

  return (
    <Box className="operationStepper">
      {steps.map((step, index) => (
        <Box className={`operationStep ${step.state}`} key={step.label}>
          <ThemeIcon
            className="operationStepIcon"
            color={step.state === "done" ? "green" : step.state === "current" ? "blue" : "gray"}
            radius="xl"
            size={34}
            variant={step.state === "todo" ? "light" : "filled"}
          >
            {step.state === "done" ? <AppIcon name="check" size={16} /> : index + 1}
          </ThemeIcon>
          <Text fw={step.state === "current" ? 800 : 600} size="sm">
            {step.label}
          </Text>
        </Box>
      ))}
    </Box>
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
  const statusLabel = item.status === "awaiting_tech" ? WAITING_TECH_STATUS : statusMeta[item.status].label;

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
          {statusLabel}
        </Badge>
      </Group>

      <Alert color="blue" icon={<AppIcon name="message" />} radius="md" variant="light">
        ระบบส่งเคสนี้ไปยัง Microsoft Teams แล้ว ตอนนี้กำลังรอทีม Tech Support ตอบกลับ
        คุณยังไม่ต้องดำเนินการเพิ่มเติมในหน้านี้
      </Alert>

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
          <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
            <Box>
              <Text c="dimmed" fw={700} size="sm">
                หมวดหมู่
              </Text>
              <Badge color="blue" mt={6} variant="light">
                {item.category}
              </Badge>
            </Box>
            <Box>
              <Text c="dimmed" fw={700} size="sm">
                ความมั่นใจของ AI
              </Text>
              <Badge color={confidenceColor(item.aiConfidence)} mt={6} variant="light">
                {item.aiConfidence}%
              </Badge>
            </Box>
          </SimpleGrid>
          <Text c="dimmed" fw={700} size="sm">
            สรุปผลวิเคราะห์
          </Text>
          <Text className="compactText" mt={6}>
            {item.summary}
          </Text>
          <Text c="dimmed" mt="sm" size="xs">
            ผลวิเคราะห์นี้เป็นการประเมินเบื้องต้นจาก AI ยังไม่ใช่การยืนยันสาเหตุที่แน่นอน
          </Text>
        </Card>
      </SimpleGrid>

      <Card padding="lg" radius="md" withBorder>
        <Group align="flex-start" justify="space-between" mb="md">
          <Box>
            <Title order={3}>3) เธรดที่ส่งให้ทีม Tech Support ใน MS Teams</Title>
            <Text c="dimmed" size="sm">
              แสดงสิ่งที่ระบบส่งเข้า Teams และสถานะหลังทีมส่งคำตอบกลับ
            </Text>
          </Box>
          <Badge color="green" variant="light">
            เชื่อมต่อ Webhook แล้ว
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
          <Paper className="teamsPreview" radius="lg" withBorder>
            <Box className="teamsHeader">
              <Group gap="sm">
                <Avatar color="violet" radius="md" size={36}>
                  TS
                </Avatar>
                <Box>
                  <Text fw={800}>Tech Support Channel</Text>
                  <Text c="dimmed" size="xs">
                    เธรด: {item.id} · Off Mai Assistant
                  </Text>
                </Box>
              </Group>
              <Badge color={statusMeta[item.status].color} variant="light">
                {statusLabel}
              </Badge>
            </Box>

            <Stack gap="md" p="md">
              <Box>
                <Title order={4}>ตัวอย่างการ์ดเคสที่ส่งไป Microsoft Teams</Title>
                <Text c="dimmed" size="sm">
                  ปุ่มในการ์ดนี้เป็น preview จาก Microsoft Teams ต้องดำเนินการใน Microsoft Teams เท่านั้น
                </Text>
                <Text c="dimmed" mt={4} size="xs">
                  เปิดเคสใน Teams = เปิดรายละเอียดเคส, รับเคส = ให้เจ้าหน้าที่รับผิดชอบเคส,
                  ขอข้อมูลเพิ่ม = ขอให้ทีมถามข้อมูลจากลูกค้าเพิ่ม
                </Text>
              </Box>
              <Group align="flex-start" gap="sm" wrap="nowrap">
                <Avatar color="blue" radius="xl" size={34}>
                  AI
                </Avatar>
                <Paper className="teamsMessage" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={800}>Off Mai Assistant</Text>
                    <Text c="dimmed" size="xs">
                      {item.createdAt}
                    </Text>
                  </Group>
                  <Text fw={700} mb="xs">
                    การ์ดเคสใหม่: {item.id}
                  </Text>
                  <Paper bg="gray.0" p="sm" radius="md">
                    <Stack gap={6}>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          ลูกค้า
                        </Text>
                        <Text fw={700} size="sm">
                          {item.customerName}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          หมวดหมู่
                        </Text>
                        <Badge color="blue" variant="light">
                          {item.category}
                        </Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          ความมั่นใจของ AI
                        </Text>
                        <Badge color={confidenceColor(item.aiConfidence)} variant="light">
                          {item.aiConfidence}%
                        </Badge>
                      </Group>
                    </Stack>
                  </Paper>
                  <Text className="compactText" mt="sm" size="sm">
                    ข้อความลูกค้า: {item.originalText}
                  </Text>
                  <Text className="compactText" mt="xs" size="sm">
                    ผลวิเคราะห์โดย AI: {item.summary}
                  </Text>
                  <Group mt="md">
                    <Button size="xs" variant="light">
                      เปิดเคสใน Teams
                    </Button>
                    <Button size="xs" variant="light">
                      รับเคส
                    </Button>
                    <Button color="gray" size="xs" variant="light">
                      ขอข้อมูลเพิ่ม
                    </Button>
                  </Group>
                </Paper>
              </Group>

              <Group align="flex-start" gap="sm" wrap="nowrap">
                <Avatar color="gray" radius="xl" size={34}>
                  SP
                </Avatar>
                <Paper className="teamsReplyPending" radius="md">
                  <Text fw={700} size="sm">
                    {WAITING_TECH_STATUS}
                  </Text>
                  <Text c="dimmed" size="sm">
                    เมื่อทีมส่งคำตอบในเธรดนี้ ระบบจะรับผ่าน Teams webhook แล้วส่งต่อให้ AI วิเคราะห์วิธีแก้
                  </Text>
                </Paper>
              </Group>

              <Paper className="teamsComposer" radius="md">
                <Text c="dimmed" size="sm">
                  การตอบต้องทำใน Microsoft Teams เพื่อให้ระบบติดตามเธรดได้ถูกต้อง
                </Text>
              </Paper>
            </Stack>
          </Paper>

          <Stack gap="md">
            <Paper bg="blue.0" p="md" radius="md">
              <Group gap="sm" mb="xs">
                <ThemeIcon color="blue" radius="xl" variant="light">
                  <AppIcon name="message" />
                </ThemeIcon>
                <Text fw={800}>สถานะการดำเนินงาน</Text>
              </Group>
              <OperationStepper />
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Paper bg="gray.0" p="md" radius="md">
                <Text c="dimmed" fw={700} size="sm">
                  วิธีแก้ที่สกัดได้
                </Text>
                <Text>{item.status === "awaiting_tech" ? "ยังไม่มีข้อมูล เนื่องจากทีมยังไม่ตอบ" : item.supportSolution}</Text>
              </Paper>
              <Paper bg="gray.0" p="md" radius="md">
                <Text c="dimmed" fw={700} size="sm">
                  ข้อความที่จะส่งให้ลูกค้า
                </Text>
                <Text>{item.status === "awaiting_tech" ? "ยังไม่สร้างข้อความตอบกลับ" : item.customerReply}</Text>
              </Paper>
            </SimpleGrid>
          </Stack>
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
