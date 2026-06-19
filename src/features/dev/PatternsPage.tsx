/**
 * /dev/patterns — Component library preview page.
 * Shows every shared content pattern with dummy data.
 * Not linked in the main nav; access directly via URL.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users, FileText, Package, BarChart2, Star,
  Pencil, Trash2, Eye, Download,
  Building2, Phone, MapPin, Hash,
} from "lucide-react";

import { PageHeader }   from "@/components/patterns/PageHeader";
import { PageSection }  from "@/components/patterns/PageSection";

import { ListRow }      from "@/components/patterns/ListRow";
import { DataTable, Column, EntityCell, ActionCell } from "@/components/patterns/DataTable";
import { StatusPill }   from "@/components/patterns/StatusPill";
import { StatCard }     from "@/components/patterns/StatCard";
import { ProgressRow }  from "@/components/patterns/ProgressRow";
import {
  FormSection, FormField, FormGrid, FormActions,
} from "@/components/patterns/FormLayout";
import {
  SparkArea, SparkBar, RadialGauge, DonutGauge,
} from "@/components/patterns/MiniChart";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge }   from "@/components/ui/badge";
import { Input }   from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";

/* ── Dummy data ─────────────────────────────────────────────── */
const SPARK1 = [28, 40, 35, 55, 48, 62, 58, 74, 66, 80, 76, 90];
const SPARK2 = [90, 80, 75, 88, 70, 65, 72, 60, 55, 50, 58, 42];
const BARS1  = [12, 19, 8, 24, 17, 29, 22, 33, 28, 38, 30, 42];
const BARS2  = [5, 8, 12, 6, 15, 10, 18, 14, 20, 16, 22, 25];

const MEMBERS = [
  { id: "1", name: "أحمد فتحي",    email: "ahmed@flexova.io",   role: "owner",     status: "active",    joined: "2024-01-15", sales: 284500 },
  { id: "2", name: "خالد أمانة",   email: "khaled@flexova.io",  role: "manager",   status: "active",    joined: "2024-03-10", sales: 198200 },
  { id: "3", name: "نورا سامي",    email: "noura@flexova.io",   role: "cashier",   status: "approved",  joined: "2024-06-01", sales: 122400 },
  { id: "4", name: "محمود عادل",   email: "mhd@flexova.io",     role: "accountant",status: "in-progress",joined: "2024-08-20", sales: 76000 },
  { id: "5", name: "سارة يونس",    email: "sara@flexova.io",    role: "cashier",   status: "pending",   joined: "2025-01-05", sales: 43200 },
  { id: "6", name: "كريم طاهر",    email: "karim@flexova.io",   role: "manager",   status: "inactive",  joined: "2025-03-12", sales: 0 },
] as const;

type Member = typeof MEMBERS[number];

const FILES = [
  { id: "f1", name: "تقرير المبيعات Q2.pdf",  type: "PDF",  size: "2.4 MB",  date: "2026-06-10", tone: "danger"  as const },
  { id: "f2", name: "ميزانية 2026.xlsx",       type: "XLSX", size: "890 KB",  date: "2026-06-08", tone: "success" as const },
  { id: "f3", name: "عرض شراكة.pptx",          type: "PPTX", size: "5.1 MB",  date: "2026-06-05", tone: "warning" as const },
  { id: "f4", name: "عقد مورّد جديد.docx",     type: "DOCX", size: "312 KB",  date: "2026-06-01", tone: "brand"   as const },
];

/* ─────────────────────────────────────────────────────────────
   Demo Page
   ───────────────────────────────────────────────────────────── */
export function PatternsPage() {
  const { t }    = useTranslation("patterns");
  const { lang } = useAppearance();
  const [saving, setSaving] = useState(false);

  /* DataTable columns */
  const cols: Column<Member>[] = [
    {
      key: "name",
      header: t("col_member"),
      cell: (r) => (
        <EntityCell
          name={r.name}
          sub={r.email}
          avatarFallback={r.name.slice(0, 2)}
        />
      ),
    },
    {
      key: "role",
      header: t("col_role"),
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {t(`role_${r.role}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      key: "status",
      header: t("col_status"),
      cell: (r) => (
        <StatusPill
          variant={r.status as Parameters<typeof StatusPill>[0]["variant"]}
          label={t(`common:status_${r.status}` as Parameters<typeof t>[0], r.status)}
        />
      ),
    },
    {
      key: "joined",
      header: t("col_joined"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.joined}</span>,
    },
    {
      key: "sales",
      header: t("col_sales"),
      numeric: true,
      cell: (r) => <span className="num text-sm">{formatMoney(r.sales, lang)}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <ActionCell actions={[
          { icon: <Eye className="h-3.5 w-3.5" />,    label: "عرض",  onClick: () => {} },
          { icon: <Pencil className="h-3.5 w-3.5" />, label: "تعديل", onClick: () => {} },
          {
            icon: <Trash2 className="h-3.5 w-3.5" />,
            label: "حذف",
            onClick: () => {},
            variant: "destructive",
          },
        ]} />
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <PageHeader title={t("page_title")} subtitle={t("page_subtitle")} />

      {/* ── 1. ListRow ──────────────────────────────────────── */}
      <PageSection
        title={t("list_row_section")}
        subtitle={t("list_row_subtitle")}
        padded={false}
      >
        {FILES.map((f) => (
          <ListRow
            key={f.id}
            tone={f.tone}
            leading={<FileText className="h-4 w-4" />}
            title={f.name}
            subtitle={`${f.type} · ${f.size}`}
            trailing={
              <span className="text-xs text-muted-foreground">{f.date}</span>
            }
            chevron
            onClick={() => {}}
          />
        ))}
      </PageSection>

      {/* ── 1b. ListRow — members with avatar ───────────────── */}
      <PageSection
        title={t("list_row_section") + " — أفاتار"}
        subtitle="Leading = Avatar component داخل الصندوق المُلوَّن"
        padded={false}
      >
        {MEMBERS.slice(0, 4).map((m) => (
          <ListRow
            key={m.id}
            tone="brand"
            leading={
              <Avatar className="h-6 w-6 rounded-full">
                <AvatarFallback className="text-[10px] rounded-full bg-transparent text-inherit font-bold">
                  {m.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            }
            title={m.name}
            subtitle={m.email}
            trailing={
              <StatusPill
                variant={m.status as Parameters<typeof StatusPill>[0]["variant"]}
                label={m.status}
              />
            }
          />
        ))}
      </PageSection>

      {/* ── 2. DataTable ─────────────────────────────────────── */}
      <PageSection
        title={t("data_table_section")}
        subtitle={t("data_table_subtitle")}
        padded={false}
      >
        <DataTable
          columns={cols}
          data={[...MEMBERS]}
          keyExtractor={(r) => r.id}
        />
      </PageSection>

      {/* ── 3. StatCard ──────────────────────────────────────── */}
      <div>
        <PageSection
          title={t("stat_card_section")}
          subtitle={t("stat_card_subtitle")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label={t("lbl_revenue")}
              value={formatMoney(312500, lang)}
              delta="+18%"
              deltaPositive
              sparkline={SPARK1}
              tone="plain"
            />
            <StatCard
              label={t("lbl_orders")}
              value="1,847"
              delta="+5%"
              deltaPositive
              bars={BARS1}
              tone="brand"
            />
            <StatCard
              label={t("lbl_customers")}
              value="284"
              delta="+12"
              deltaPositive
              sparkline={SPARK2}
              tone="success"
            />
            <StatCard
              label={t("lbl_avg_basket")}
              value={formatMoney(169, lang)}
              delta="-3%"
              deltaPositive={false}
              bars={BARS2}
              tone="warning"
            />
          </div>
        </PageSection>
      </div>

      {/* ── 4. ProgressRow ───────────────────────────────────── */}
      <PageSection
        title={t("progress_section")}
        subtitle={t("progress_subtitle")}
      >
        <div className="space-y-4">
          <ProgressRow label={t("lbl_sales_target")}  value={74} displayValue="74%" tone="brand"   />
          <ProgressRow label={t("lbl_collection")}    value={89} displayValue="89%" tone="success" />
          <ProgressRow label={t("lbl_new_customers")} value={52} displayValue="52%" tone="warning" />
          <ProgressRow label={t("lbl_satisfaction")}  value={93} displayValue="93%" tone="success" />
        </div>
      </PageSection>

      {/* ── 5. FormLayout ────────────────────────────────────── */}
      <PageSection
        title={t("form_section")}
        subtitle={t("form_subtitle")}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaving(true);
            setTimeout(() => setSaving(false), 1800);
          }}
          className="space-y-6"
        >
          <FormSection title={t("form_basic")} subtitle={t("form_basic_sub")}>
            <FormGrid cols={2}>
              <FormField label={t("lbl_company")} htmlFor="company" required>
                <Input id="company" placeholder={t("ph_company")} />
              </FormField>

              <FormField
                label={t("lbl_tax_id")}
                htmlFor="tax"
                helper={t("helper_tax")}
              >
                <Input id="tax" placeholder={t("ph_tax_id")} />
              </FormField>

              <FormField label={t("lbl_phone")} htmlFor="phone">
                <Input id="phone" placeholder={t("ph_phone")} type="tel" dir="ltr" />
              </FormField>

              <FormField label={t("lbl_address")} htmlFor="address">
                <Input id="address" placeholder={t("ph_address")} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="الحالة والتصنيف" subtitle="التحكم في ظهور السجل ودرجته">
            <FormGrid cols={2}>
              <FormField label={t("col_status")} htmlFor="status-sel">
                <Select defaultValue="active">
                  <SelectTrigger id="status-sel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                    <SelectItem value="pending">معلّق</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="التقييم"
                htmlFor="tier"
                error="هذا الحقل مطلوب"
              >
                <Select>
                  <SelectTrigger id="tier">
                    <SelectValue placeholder="اختر التقييم…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">ذهبي</SelectItem>
                    <SelectItem value="silver">فضّي</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormActions saving={saving} />
        </form>
      </PageSection>

      {/* ── 6. MiniChart / Gauge ─────────────────────────────── */}
      <PageSection
        title={t("mini_chart_section")}
        subtitle={t("mini_chart_subtitle")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* SparkArea */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              SparkArea
            </p>
            <SparkArea data={SPARK1} tone="brand"   height={64} />
            <SparkArea data={SPARK2} tone="danger"  height={64} />
            <SparkArea data={BARS1}  tone="success" height={64} />
          </div>

          {/* SparkBar */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              SparkBar
            </p>
            <SparkBar data={BARS1}  tone="brand"   height={64} />
            <SparkBar data={BARS2}  tone="warning" height={64} />
            <SparkBar data={SPARK1} tone="success" height={64} />
          </div>

          {/* RadialGauge */}
          <div className="flex flex-col gap-4 items-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide self-start">
              RadialGauge
            </p>
            <RadialGauge value={74} label={t("gauge_action")} tone="brand"   size={130} />
            <RadialGauge value={92} label="رضا العملاء"       tone="success" size={110} />
            <RadialGauge value={38} label="نسبة الخصومات"     tone="danger"  size={110} />
          </div>

          {/* DonutGauge */}
          <div className="flex flex-col gap-4 items-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide self-start">
              DonutGauge
            </p>
            <DonutGauge
              slices={[
                { label: t("lbl_active"),       value: 3820, tone: "brand"   },
                { label: t("lbl_inactive"),      value: 980,  tone: "warning" },
                { label: t("lbl_pending_lbl"),   value: 430,  tone: "danger"  },
              ]}
              centerLabel={t("gauge_users")}
              centerValue="5,230"
              size={150}
            />

            {/* Legend */}
            <div className="w-full space-y-1.5 text-xs">
              {[
                { label: t("lbl_active"),     value: "3,820", tone: "brand"  , dot: "bg-brand"   },
                { label: t("lbl_inactive"),   value: "980",   tone: "warning", dot: "bg-warning" },
                { label: t("lbl_pending_lbl"),value: "430",   tone: "danger" , dot: "bg-danger"  },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="font-medium num text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageSection>

      {/* ── StatusPill gallery ───────────────────────────────── */}
      <PageSection title="StatusPill — كل المتغيّرات" subtitle="Variant gallery">
        <div className="flex flex-wrap gap-2">
          {(["approved","active","sent","paid","in-progress","pending","credit","rejected","inactive","default"] as const).map((v) => (
            <StatusPill key={v} variant={v} label={v} />
          ))}
        </div>
      </PageSection>
    </div>
  );
}
