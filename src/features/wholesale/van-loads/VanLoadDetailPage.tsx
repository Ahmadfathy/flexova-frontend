import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Boxes, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { PageSection } from "@/components/patterns/PageSection";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatDate } from "@/lib/format";
import { useAppearance } from "@/stores/appearance";
import { useCan } from "@/lib/permissions";
import { useWholesaleVanLoads } from "@/stores/wholesaleVanLoads";
import { getReps, getWarehouses, getItems, getUoms } from "@/lib/mock/wholesale";
import type { VanLoadStatus } from "@/types/wholesale";

const STATUS_PILL: Record<VanLoadStatus, PillVariant> = {
  sent: "sent",
  received: "approved",
  dispute: "rejected",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function VanLoadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("wholesale");
  const { lang } = useAppearance();
  const can = useCan();

  const loads = useWholesaleVanLoads((s) => s.loads);
  const confirmReceipt = useWholesaleVanLoads((s) => s.confirmReceipt);
  const resolveDispute = useWholesaleVanLoads((s) => s.resolveDispute);

  const load = loads.find((l) => l.id === id);
  const reps = useMemo(() => getReps(), []);
  const warehouses = useMemo(() => getWarehouses(), []);
  const items = useMemo(() => getItems(), []);
  const uoms = useMemo(() => getUoms(), []);

  const [received, setReceived] = useState<Record<string, string>>({});
  const [resolutionType, setResolutionType] = useState<"adjust_sent" | "accept_variance">("adjust_sent");
  const [resolutionReason, setResolutionReason] = useState("");

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  if (!load) {
    return (
      <div className="h-full overflow-auto p-4">
        <EmptyState icon={Boxes} title={t("van_load_detail.not_found")} description="" />
      </div>
    );
  }

  const rep = reps.find((r) => r.id === load.rep_id);
  const fromWh = warehouses.find((w) => w.id === load.from_warehouse);
  const toWh = warehouses.find((w) => w.id === load.to_warehouse);

  function itemName(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    return item ? (lang === "ar" ? item.name_ar : item.name_en) : itemId;
  }
  function uomLabel(uomId: string) {
    const u = uoms.find((x) => x.id === uomId);
    return u ? (lang === "ar" ? u.name_ar : u.name_en) : uomId;
  }

  function handleConfirmReceipt() {
    const receivedNums: Record<string, number> = {};
    for (const line of load!.lines) {
      receivedNums[line.item_id] = parseFloat(received[line.item_id] ?? String(line.qty_received)) || 0;
    }
    confirmReceipt(load!.id, receivedNums);
    toast.success(t("van_load_detail.confirm_success"));
  }

  function handleResolveDispute() {
    if (!resolutionReason.trim()) { toast.error(t("van_load_detail.error_reason_required")); return; }
    resolveDispute(load!.id, { type: resolutionType, reason: resolutionReason });
    toast.success(t("van_load_detail.resolve_success"));
    setResolutionReason("");
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/wholesale/van-loads")}>
          <BackIcon className="h-4 w-4 me-1" />
          {t("van_load_detail.back")}
        </Button>

        <PageHeader
          title={load.number}
          subtitle={`${fromWh ? (lang === "ar" ? fromWh.name_ar : fromWh.name_en) : "—"} → ${toWh ? (lang === "ar" ? toWh.name_ar : toWh.name_en) : "—"}`}
        />

        <div className="flex items-center gap-3">
          <StatusPill variant={STATUS_PILL[load.status]} label={t(`van_loads.status_${load.status}`)} />
          <span className="text-sm text-muted-foreground">{rep ? (lang === "ar" ? rep.name_ar : rep.name_en) : "—"}</span>
          <span className="text-sm text-muted-foreground">· {formatDate(load.date)}</span>
        </div>

        {load.status === "dispute" && (
          <Alert variant="danger" title={t("van_load_detail.dispute_title")}>
            {t("van_load_detail.dispute_body")}
          </Alert>
        )}

        <PageSection title={t("van_load_detail.lines_title")}>
          <div className="rounded border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("van_load_detail.col_item")}</TableHead>
                  <TableHead className="text-end">{t("van_load_detail.col_sent")}</TableHead>
                  <TableHead className="text-end">{t("van_load_detail.col_received")}</TableHead>
                  <TableHead className="text-end">{t("van_load_detail.col_variance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {load.lines.map((line) => {
                  const liveReceived = load.status === "sent"
                    ? parseFloat(received[line.item_id] ?? String(line.qty_sent)) || 0
                    : line.qty_received;
                  const variance = round2(liveReceived - line.qty_sent);
                  return (
                    <TableRow key={line.item_id}>
                      <TableCell>{itemName(line.item_id)} <span className="text-muted-foreground">({uomLabel(line.uom_id)})</span></TableCell>
                      <TableCell className="text-end tabular-nums">{line.qty_sent}</TableCell>
                      <TableCell className="text-end">
                        {load.status === "sent" ? (
                          <Input
                            type="number" min={0} step="any"
                            value={received[line.item_id] ?? String(line.qty_sent)}
                            onChange={(e) => setReceived((prev) => ({ ...prev, [line.item_id]: e.target.value }))}
                            className="h-8 text-end tabular-nums w-24 ms-auto"
                          />
                        ) : (
                          <span className="tabular-nums">{line.qty_received}</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-end tabular-nums ${variance !== 0 ? "text-danger-text font-medium" : "text-success-text"}`}>
                        {variance > 0 ? "+" : ""}{variance}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </PageSection>

        {load.status === "sent" && (
          <Button className="w-full" disabled={!can("van.load.confirm")} onClick={handleConfirmReceipt}>
            {t("van_load_detail.confirm_action")}
          </Button>
        )}

        {load.status === "dispute" && (
          <PageSection title={t("van_load_detail.resolve_title")}>
            <div className="space-y-3">
              <Select value={resolutionType} onValueChange={(v) => setResolutionType(v as typeof resolutionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjust_sent">{t("van_load_detail.resolution_adjust_sent")}</SelectItem>
                  <SelectItem value="accept_variance">{t("van_load_detail.resolution_accept_variance")}</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                rows={2}
                placeholder={t("van_load_detail.reason_placeholder")}
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
              />
              <Button className="w-full" disabled={!can("van.load.confirm")} onClick={handleResolveDispute}>
                <AlertTriangle className="h-4 w-4 me-1.5" />
                {t("van_load_detail.resolve_action")}
              </Button>
            </div>
          </PageSection>
        )}

        {load.status === "received" && load.resolution && (
          <p className="text-xs text-muted-foreground">
            {t(`van_load_detail.resolution_${load.resolution.type}`)} — {load.resolution.reason} ({formatDate(load.resolution.resolved_at)})
          </p>
        )}
      </div>
    </div>
  );
}
