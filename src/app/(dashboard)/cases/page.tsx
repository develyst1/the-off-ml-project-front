import {
  Alert,
  Anchor,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconHourglass,
  IconInbox,
  IconTool,
} from "@tabler/icons-react";
import Link from "next/link";
import { KpiTile } from "@/components/KpiTile";
import { ConfidenceBadge, StatusBadge } from "@/components/StatusBadge";
import { CASES, INBOX_KPIS } from "@/lib/mock-data";

export default function CaseInboxPage() {
  return (
    <Stack gap="lg" maw={1100}>
      <Title order={2}>กล่องข้อความเคส (Case Inbox)</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <KpiTile icon={IconInbox} color="blue" value={INBOX_KPIS.awaitingTech} label="รอทีมตอบ" />
        <KpiTile
          icon={IconHourglass}
          color="orange"
          value={INBOX_KPIS.awaitingConfirmation}
          label="รอยืนยัน AI แนะนำ"
        />
        <KpiTile
          icon={IconCircleCheck}
          color="green"
          value={INBOX_KPIS.resolvedThisMonth}
          label="ปิดเคสแล้ว (เดือนนี้)"
        />
        <KpiTile icon={IconAlertTriangle} color="red" value={INBOX_KPIS.overSla} label="เกิน SLA" />
        <KpiTile
          icon={IconTool}
          color="gray"
          value={INBOX_KPIS.needsManualReview}
          label="ต้องตรวจสอบด้วยตนเอง (AI ล้มเหลว)"
        />
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Text fw={700} mb="sm">
          เคสล่าสุดจากลูกค้า (LINE)
        </Text>
        <Table verticalSpacing="sm" highlightOnHover>
          <thead>
            <tr>
              <th>ลูกค้า</th>
              <th>ข้อความต้นฉบับ</th>
              <th>หมวดหมู่ (AI วิเคราะห์)</th>
              <th>ความมั่นใจ</th>
              <th>สถานะ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {CASES.map((c) => (
              <tr key={c.id}>
                <td>{c.customerName}</td>
                <td style={{ maxWidth: 280 }}>&ldquo;{c.originalText}&rdquo;</td>
                <td>{c.category ?? "— (AI วิเคราะห์ไม่สำเร็จ)"}</td>
                <td>
                  <ConfidenceBadge pct={c.confidencePct} />
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td>
                  <Anchor component={Link} href={`/cases/${c.id}`} size="sm" fw={700}>
                    เปิดเคส →
                  </Anchor>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>

      <Alert
        variant="light"
        color="blue"
        title="กติกาหน้าจอนี้ (UC-003/UC-004)"
        icon={<IconInbox size={18} />}
      >
        ทุกเคสใหม่จาก LINE ต้องถูก AI CENTER วิเคราะห์และบันทึก <b>ข้อความต้นฉบับ + ผลวิเคราะห์ + ตัวตนลูกค้า</b> ลง
        database ก่อนเสมอ ก่อนถูกส่งแจ้งทีม Tech Support ใน MS Teams — แถวที่มีความมั่นใจ ≥ 90% จะถูกจัดกลุ่มไปที่คิว
        &quot;รอยืนยัน AI แนะนำ&quot; แทนคิวปกติ — ถ้า AI วิเคราะห์ไม่สำเร็จเลย (UC-017) เคสจะขึ้นสถานะ
        &quot;ต้องตรวจสอบด้วยตนเอง&quot; แทนที่จะไม่มีใครเห็นเคสนั้น
      </Alert>
    </Stack>
  );
}
