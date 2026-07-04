import { Alert, Badge, Group, Paper, Progress, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { IconBulb, IconClock, IconMail, IconTarget } from "@tabler/icons-react";
import { KpiTile } from "@/components/KpiTile";
import { ANALYTICS_SUMMARY } from "@/lib/mock-data";

export default function AnalyticsPage() {
  return (
    <Stack gap="lg" maw={1100}>
      <Title order={2}>ภาพรวม/สถิติเคส (Analytics Dashboard)</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <KpiTile
          icon={IconMail}
          color="blue"
          value={ANALYTICS_SUMMARY.totalCasesThisMonth}
          label="เคสทั้งหมด (เดือนนี้)"
        />
        <KpiTile
          icon={IconBulb}
          color="green"
          value={`${ANALYTICS_SUMMARY.resolvedFromExistingSolutionPct}%`}
          label="แก้ได้จาก solution เดิม"
        />
        <KpiTile
          icon={IconClock}
          color="orange"
          value={`${ANALYTICS_SUMMARY.avgResponseMinutes} นาที`}
          label="เวลาตอบเฉลี่ย"
        />
        <KpiTile
          icon={IconTarget}
          color="grape"
          value={ANALYTICS_SUMMARY.solutionsReadyForApprove}
          label="solution มั่นใจ 100% (พร้อมขอ approve)"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder radius="md" p="md">
          <Text fw={700} mb="sm">
            หมวดหมู่เคสที่เกิดบ่อยที่สุด
          </Text>
          <Stack gap="sm">
            {ANALYTICS_SUMMARY.categories.map((c) => (
              <Group key={c.name} wrap="nowrap" gap="sm">
                <Text size="sm" w={110}>
                  {c.name}
                </Text>
                <Progress value={c.pct} color={c.color} flex={1} size="lg" radius="sm" />
                <Text size="xs" w={30} ta="right">
                  {c.count}
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Text fw={700} mb="sm">
            การกระจายความมั่นใจของ solution
          </Text>
          <Table verticalSpacing="sm">
            <thead>
              <tr>
                <th>ช่วงความมั่นใจ</th>
                <th>จำนวนเคส</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {ANALYTICS_SUMMARY.confidenceDistribution.map((row) => (
                <tr key={row.range}>
                  <td>{row.range}</td>
                  <td>{row.count}</td>
                  <td>
                    <Badge variant="light" color={row.color}>
                      {row.handling}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Paper>
      </SimpleGrid>

      <Alert variant="light" color="blue" title="กติกาหน้าจอนี้ (UC-013)">
        ใช้ข้อมูลที่สะสมจากทุกเคสเพื่อดูเคสที่เกิดบ่อย ประเภท หมวดหมู่ ความมั่นใจ และวิธีแก้ของแต่ละเคส —
        เป็นข้อมูลประกอบการตัดสินใจว่าเมื่อไหร่ควรเปิดใช้ auto-answer (UC-014, ดูตั้งค่าอัตโนมัติ)
      </Alert>
    </Stack>
  );
}
