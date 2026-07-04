import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconArrowRight, IconPencil } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfidenceBadge, StatusBadge } from "@/components/StatusBadge";
import { CASE_DETAILS } from "@/lib/mock-data";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = CASE_DETAILS[id];
  if (!detail) notFound();

  const isUnanalyzed = detail.analysis.category.startsWith("—");

  return (
    <Stack gap="lg" maw={1000}>
      <Group justify="space-between" wrap="wrap">
        <Title order={2}>
          {detail.id} · {detail.customerName}
        </Title>
        <StatusBadge status={detail.status} />
      </Group>

      <Paper withBorder radius="md" p="md">
        <Text fw={700} mb="xs">
          1) ข้อความต้นฉบับจากลูกค้า (LINE)
        </Text>
        <Paper bg="gray.0" p="sm" radius="sm">
          &ldquo;{detail.originalText}&rdquo;
        </Paper>
        <Text size="xs" c="dimmed" mt="xs">
          line_user_id: {detail.lineUserId} · ส่งเมื่อ {detail.receivedAt}
        </Text>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Text fw={700} mb="xs">
          2) ผลวิเคราะห์โดย API AI CENTER
        </Text>
        {isUnanalyzed ? (
          <Alert variant="light" color="red" icon={<IconAlertTriangle size={18} />}>
            {detail.analysis.summary}
          </Alert>
        ) : (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }} mb="sm">
              <div>
                <Text size="xs" c="dimmed">
                  หมวดหมู่
                </Text>
                <Badge variant="light" color="blue">
                  {detail.analysis.category}
                </Badge>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  ความมั่นใจ
                </Text>
                <ConfidenceBadge pct={detail.analysis.confidencePct} />
              </div>
            </SimpleGrid>
            <Paper bg="gray.0" p="sm" radius="sm">
              {detail.analysis.summary}
            </Paper>
          </>
        )}
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Text fw={700} mb="sm">
          3) เธรดที่ส่งให้ทีม Tech Support ใน MS Teams
        </Text>
        <Group gap="xs" mb="sm" wrap="wrap">
          {["แจ้งลูกค้า+ข้อความ+ผลวิเคราะห์", "รอทีมตอบกลับ", "AI วิเคราะห์คำตอบทีม", "AI ปรับข้อความ", "ทีมตรวจสอบ/แก้ไข → ส่งลูกค้า"].map(
            (step, i, arr) => (
              <Group key={step} gap="xs" wrap="nowrap">
                <Badge variant={i === 0 ? "filled" : "outline"} color="blue" radius="sm">
                  {step}
                </Badge>
                {i < arr.length - 1 && <IconArrowRight size={14} />}
              </Group>
            ),
          )}
        </Group>
        {detail.techReply ? (
          <Text size="sm">คำตอบดิบจากทีม: &ldquo;{detail.techReply.raw}&rdquo;</Text>
        ) : (
          <Text size="sm" c="dimmed">
            ยังไม่มีการตอบกลับจากทีม Tech Support ในเธรดนี้…
          </Text>
        )}
      </Paper>

      {detail.techReply && (
        <Paper withBorder radius="md" p="md" style={{ borderStyle: "dashed" }}>
          <Text fw={700} mb="sm">
            4) ตรวจสอบก่อนส่งลูกค้า
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                คำตอบดิบจากทีม Tech Support (Teams)
              </Text>
              <Paper bg="gray.0" p="sm" radius="sm">
                &ldquo;{detail.techReply.raw}&rdquo;
              </Paper>
            </div>
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                ข้อความที่ AI ปรับให้เข้าใจง่าย (แก้ไขได้ก่อนส่ง)
              </Text>
              <Textarea defaultValue={detail.techReply.aiRewritten} minRows={4} autosize />
            </div>
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Button variant="default" leftSection={<IconPencil size={16} />}>
              แก้ไขข้อความ
            </Button>
            <Button>ยืนยันและส่งให้ลูกค้า (LINE)</Button>
          </Group>
        </Paper>
      )}

      <Paper withBorder radius="md" p="md">
        <Text fw={700} mb="sm">
          5) ประวัติเคสก่อนหน้าของลูกค้าคนนี้ ({detail.customerName})
        </Text>
        {detail.history.length === 0 ? (
          <Text size="sm" c="dimmed">
            ไม่มีประวัติเคสก่อนหน้าของลูกค้าคนนี้
          </Text>
        ) : (
          <Table verticalSpacing="sm">
            <thead>
              <tr>
                <th>เคส</th>
                <th>วันที่แจ้ง</th>
                <th>หมวดหมู่</th>
                <th>วิธีแก้</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {detail.history.map((h) => (
                <tr key={h.id}>
                  <td>{h.id}</td>
                  <td>{h.date}</td>
                  <td>
                    <Badge variant="light" color="blue">
                      {h.category}
                    </Badge>
                  </td>
                  <td>&ldquo;{h.solution}&rdquo;</td>
                  <td>
                    <Badge variant="light" color="green">
                      ปิดเคสแล้ว
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Text size="xs" c="dimmed" mt="xs">
          ดึงจาก API-017 <code>GET /customers/:id/cases</code> — เรียงจากล่าสุดไปเก่าสุด (UC-016)
        </Text>
      </Paper>

      <Alert variant="light" color="red" title="กติกาหน้าจอนี้ (UC-006/UC-007/UC-008)">
        เมื่อทีม Tech Support ตอบกลับใน MS Teams ระบบต้อง <b>วิเคราะห์ข้อความตอบกลับก่อนเก็บลง database</b> เพื่อสกัด
        &quot;วิธีการแก้ปัญหา&quot; ของเคสนี้ แล้วจึงค่อยให้ AI ปรับข้อความให้เข้าใจง่าย (UC-008) —{" "}
        <b>ห้ามส่งข้อความดิบของทีมตรง ๆ และห้ามส่งข้อความที่ AI ปรับแล้วออกไปโดยอัตโนมัติ</b> ต้องให้ Tech Support
        ตรวจสอบ/แก้ไขข้อความที่ AI ปรับแล้วกดยืนยันก่อนระบบส่งกลับลูกค้าทาง LINE (UC-009) ทุกครั้ง
      </Alert>

      <Anchor component={Link} href="/cases" size="sm">
        ← กลับไปกล่องข้อความเคส
      </Anchor>
    </Stack>
  );
}
