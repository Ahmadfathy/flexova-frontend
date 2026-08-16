import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users2, Plus, Link2 } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatusPill } from "@/components/patterns/StatusPill";
import { EntityCell } from "@/components/patterns/DataTable";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useEcommerceAffiliates } from "@/stores/ecommerceAffiliates";
import { AFFILIATE_STATUS_PILL } from "../catalog";
import { AffiliateCreateModal } from "./AffiliateCreateModal";
import type { EcAffiliate } from "../types";

/** spec §6.1 — affiliate list: name/data, tracking code/link, commission,
 * clicks, attributed orders, balance due, status. */
export function AffiliatesListPage() {
  const { t } = useTranslation("ecommerce");
  const { lang } = useAppearance();
  const navigate = useNavigate();
  const can = useCan();

  const affiliatesMap = useEcommerceAffiliates((s) => s.affiliates);
  const affiliates = useMemo(() => Object.values(affiliatesMap), [affiliatesMap]);
  const [createOpen, setCreateOpen] = useState(false);
  const canManage = can("ecommerce.affiliates.manage");

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title={t("affiliates.title")}
        count={affiliates.length > 0 ? t("affiliates.count", { n: affiliates.length }) : undefined}
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> {t("affiliates.new")}</Button>
          ) : undefined
        }
      />

      <PageSection padded={false}>
        {affiliates.length === 0 ? (
          <EmptyState icon={Users2} title={t("affiliates.no_affiliates")} description={t("affiliates.empty_sub")} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affiliates.col_affiliate")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affiliates.col_code")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affiliates.col_commission")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affiliates.col_clicks")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affiliates.col_orders")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affiliates.col_balance")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affiliates.col_status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((a) => (
                    <AffiliateRow key={a.id} affiliate={a} lang={lang} t={t} onClick={() => navigate(`/ecommerce/affiliates/${a.id}`)} />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {affiliates.map((a) => (
                <div key={a.id} className="px-4 py-3 space-y-1.5 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/ecommerce/affiliates/${a.id}`)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{a.name_ar}</span>
                    <StatusPill variant={AFFILIATE_STATUS_PILL[a.status]} label={t(`affiliates.status_${a.status}`)} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span dir="ltr" className="font-mono">{a.code}</span>
                    <span className="tabular-nums font-medium text-foreground">{formatMoney(a.balance_due, lang)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </PageSection>

      <AffiliateCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function AffiliateRow({
  affiliate, lang, t, onClick,
}: {
  affiliate: EcAffiliate;
  lang: "ar" | "en";
  t: ReturnType<typeof useTranslation<"ecommerce">>["t"];
  onClick: () => void;
}) {
  return (
    <TableRow className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer" onClick={onClick}>
      <TableCell className="px-4 py-3.5">
        <EntityCell name={affiliate.name_ar} sub={affiliate.phone} avatarFallback={affiliate.name_ar.slice(0, 2)} />
      </TableCell>
      <TableCell className="px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground" dir="ltr">
          <Link2 className="h-3 w-3" /> {affiliate.code}
        </span>
      </TableCell>
      <TableCell className="tabular-nums px-4 py-3.5 text-sm">{affiliate.commission_pct}%</TableCell>
      <TableCell className="tabular-nums px-4 py-3.5 text-sm text-muted-foreground">{affiliate.clicks}</TableCell>
      <TableCell className="tabular-nums px-4 py-3.5 text-sm text-muted-foreground">{affiliate.attributed_orders}</TableCell>
      <TableCell className="tabular-nums font-medium px-4 py-3.5">{formatMoney(affiliate.balance_due, lang)}</TableCell>
      <TableCell className="px-4 py-3.5">
        <StatusPill variant={AFFILIATE_STATUS_PILL[affiliate.status]} label={t(`affiliates.status_${affiliate.status}`)} />
      </TableCell>
    </TableRow>
  );
}
