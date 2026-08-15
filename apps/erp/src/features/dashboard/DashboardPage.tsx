import { useTranslation } from "react-i18next";
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { KpiCard } from "@/components/patterns/KpiCard";
import { StatusPill } from "@/components/patterns/StatusPill";
import { DataTable, Column } from "@/components/patterns/DataTable";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";

interface RecentSale {
  id: string;
  customer: string;
  amount: number;
  status: "paid" | "credit" | "sent" | "rejected";
  date: string;
}

const RECENT: RecentSale[] = [
  { id: "INV-001", customer: "سوبر ماركت النيل", amount: 12450, status: "paid",     date: "2026-06-14" },
  { id: "INV-002", customer: "مطعم الأصيل",       amount: 3200,  status: "credit",   date: "2026-06-13" },
  { id: "INV-003", customer: "مخبز الجودة",        amount: 870,   status: "sent",     date: "2026-06-13" },
  { id: "INV-004", customer: "كافيه الزهراء",      amount: 5600,  status: "paid",     date: "2026-06-12" },
  { id: "INV-005", customer: "محل الأمانة",        amount: 980,   status: "rejected", date: "2026-06-11" },
];

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوع", credit: "آجل", sent: "مرسلة", rejected: "مرفوضة",
};

export default function DashboardPage() {
  const { t }    = useTranslation("shell");
  const { lang } = useAppearance();

  const columns: Column<RecentSale>[] = [
    { key: "id",       header: "رقم الفاتورة", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "customer", header: "العميل",       cell: (r) => r.customer },
    { key: "date",     header: "التاريخ",      cell: (r) => r.date },
    { key: "amount",   header: "المبلغ",       cell: (r) => <span className="num">{formatMoney(r.amount, lang)}</span>, numeric: true },
    { key: "status",   header: "الحالة",       cell: (r) => <StatusPill variant={r.status} label={STATUS_LABELS[r.status]} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.dashboard")} subtitle="مرحباً بك في فليكسوڤا" />

      {/* KPI row — each KpiCard is already a card variant */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingCart} label="المبيعات اليوم"   value={formatMoney(24350, lang)} delta="+12%" deltaPositive />
        <KpiCard icon={Package}     label="أصناف في المخزون"  value="1,234" />
        <KpiCard icon={Users}       label="عملاء نشطون"       value="87"    delta="+3"  deltaPositive />
        <KpiCard icon={TrendingUp}  label="الإيرادات الشهرية" value={formatMoney(312000, lang)} delta="+8%" deltaPositive />
      </div>

      {/* Recent sales — table reaches card edges via padded=false */}
      <PageSection title="آخر المبيعات" subtitle="آخر 5 فواتير" padded={false}>
        <DataTable
          columns={columns}
          data={RECENT}
          keyExtractor={(r) => r.id}
        />
      </PageSection>
    </div>
  );
}
