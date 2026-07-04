import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus, Trash2, AlertCircle, CheckCircle2, AlertTriangle, ExternalLink,
  ChevronDown, Loader2,
} from "lucide-react";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { Skeleton }      from "@/components/patterns/Skeletons";
import { DatePicker }    from "@/components/patterns/DatePicker";

import { Button }     from "@/components/ui/button";
import { Input }      from "@/components/ui/input";
import { Badge }      from "@/components/ui/badge";
import { Separator }  from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { formatMoney } from "@/lib/format";
import { cn }          from "@/lib/utils";
import { useCan }      from "@/lib/permissions";
import { useSalesData } from "./useSalesData";
import type { SalesData, InventoryItem, SalesCustomer } from "./useSalesData";
import { useEtaConnection } from "@/hooks/useEtaConnection";
import { EtaConnectBanner } from "@/features/sales/eta-hub/EtaConnectBanner";

// ── Local types ──────────────────────────────────────────────────

type Channel = "auto" | "e-invoice" | "e-receipt";

interface InvoiceLine {
  _key: string;
  item_id: string;
  description: string;
  qty: number;
  uom_id: string;
  price: number;
  list_price: number;
  price_overridden: boolean;
  line_discount: number;
  tax_type_id: string;
}

interface InvoiceDraft {
  customer_id: string;
  channel_override: Channel;
  date: string;
  warehouse_id: string;
  payment_method_id: string;
  notes: string;
  lines: InvoiceLine[];
}

interface TaxBreakdownRow {
  tax_type_id: string;
  name: string;
  rate: number;
  taxable: number;
  amount: number;
}

interface LiveTotals {
  subtotal: number;
  total_discount: number;
  taxable_base: number;
  tax_breakdown: TaxBreakdownRow[];
  total_tax: number;
  grand_total: number;
}

interface EtaBlocker {
  id: string;
  messageKey: string;
  params?: Record<string, string | number>;
  isLink?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function newLine(): InvoiceLine {
  return {
    _key: `${Date.now()}-${Math.random()}`,
    item_id: "", description: "", qty: 1,
    uom_id: "", price: 0, list_price: 0,
    price_overridden: false, line_discount: 0, tax_type_id: "",
  };
}

function computeTotals(lines: InvoiceLine[], data: SalesData | null, lang: "ar" | "en"): LiveTotals {
  const taxTypes = data?.taxTypes ?? [];
  let subtotal = 0;
  let total_discount = 0;
  const breakdown: Record<string, TaxBreakdownRow> = {};

  for (const line of lines) {
    if (!line.item_id) continue;
    const gross  = line.qty * line.price;
    const net    = gross - line.line_discount;
    subtotal     += gross;
    total_discount += line.line_discount;

    const tt = taxTypes.find(t => t.id === line.tax_type_id);
    if (tt) {
      if (!breakdown[tt.id]) {
        breakdown[tt.id] = {
          tax_type_id: tt.id,
          name: lang === "ar" ? tt.name_ar : tt.name_en,
          rate: tt.rate,
          taxable: 0,
          amount: 0,
        };
      }
      breakdown[tt.id].taxable += net;
      breakdown[tt.id].amount  += net * (tt.rate / 100);
    }
  }

  const taxable_base = subtotal - total_discount;
  const tax_breakdown = Object.values(breakdown);
  const total_tax = tax_breakdown.reduce((s, b) => s + b.amount, 0);
  return {
    subtotal,
    total_discount,
    taxable_base,
    tax_breakdown,
    total_tax,
    grand_total: taxable_base + total_tax,
  };
}

function getItemListPrice(item: InventoryItem, customer: SalesCustomer | null): number {
  if (customer?.price_list_id && item.prices[customer.price_list_id] !== undefined) {
    return item.prices[customer.price_list_id];
  }
  // fallback: first price in the map
  const vals = Object.values(item.prices);
  return vals.length ? vals[0] : 0;
}

function detectChannel(customer: SalesCustomer | null): "e-invoice" | "e-receipt" {
  if (customer?.type === "b2b") return "e-invoice";
  return "e-receipt";
}

function isTrnValid(trn: string): boolean {
  return /^\d{9}$/.test(trn.trim());
}

// ── Skeletons ────────────────────────────────────────────────────

function HeaderZoneSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div>
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-muted/30">
        {[140, 80, 64, 64, 80, 72, 72, 80].map((w, i) => (
          <Skeleton key={i} className="h-3.5 rounded" style={{ width: w }} />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
             style={{ opacity: 1 - i * 0.25 }}>
          <Skeleton className="h-8 w-36 rounded" />
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Line row ─────────────────────────────────────────────────────

interface LineRowProps {
  line:     InvoiceLine;
  idx:      number;
  data:     SalesData;
  customer: SalesCustomer | null;
  lang:     "ar" | "en";
  t:        ReturnType<typeof useTranslation>["t"];
  onUpdate: (key: string, field: keyof InvoiceLine, value: unknown) => void;
  onSelectItem: (key: string, itemId: string) => void;
  onRemove: (key: string) => void;
  hasBlocker: boolean;
}

function LineRow({ line, idx, data, lang, t, onUpdate, onSelectItem, onRemove, hasBlocker }: LineRowProps) {
  const n = idx + 1;
  const item   = data.items.find(i => i.id === line.item_id);
  const lineNet = line.qty * line.price - line.line_discount;

  return (
    <TableRow className={cn(hasBlocker && "bg-danger-tint/30")}>
      {/* Item */}
      <TableCell className="min-w-[160px]">
        <div className="flex items-center gap-1.5">
          {hasBlocker && (
            <AlertCircle className="h-3.5 w-3.5 text-danger shrink-0" aria-label="blocker" />
          )}
          <Select
            value={line.item_id}
            onValueChange={v => onSelectItem(line._key, v)}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder={t("editor.select_item")} />
            </SelectTrigger>
            <SelectContent>
              {data.items
                .filter(i => i.status === "active" || i.id === line.item_id)
                .map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    <span className="flex items-center gap-1.5">
                      {lang === "ar" ? i.name_ar : i.name_en}
                      {!i.eta_code && (
                        <AlertTriangle className="h-3 w-3 text-warning inline-block" />
                      )}
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>

      {/* Description */}
      <TableCell className="min-w-[120px]">
        <Input
          className="h-8 text-xs"
          value={line.description}
          onChange={e => onUpdate(line._key, "description", e.target.value)}
          placeholder={item ? (lang === "ar" ? item.name_ar : item.name_en) : ""}
        />
      </TableCell>

      {/* Qty */}
      <TableCell className="w-20">
        <Input
          type="number"
          min={0.001}
          step="any"
          className="h-8 text-xs tabular-nums text-start"
          value={line.qty}
          onChange={e => onUpdate(line._key, "qty", parseFloat(e.target.value) || 0)}
        />
      </TableCell>

      {/* UOM */}
      <TableCell className="w-24">
        <Select
          value={line.uom_id}
          onValueChange={v => onUpdate(line._key, "uom_id", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {data.uoms.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {lang === "ar" ? u.name_ar : u.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Price */}
      <TableCell className="w-28">
        <div className="relative">
          <Input
            type="number"
            min={0}
            step="0.01"
            className={cn(
              "h-8 text-xs tabular-nums text-start pe-1",
              line.price_overridden && "border-warning text-warning-text"
            )}
            value={line.price}
            onChange={e => {
              const v = parseFloat(e.target.value) || 0;
              onUpdate(line._key, "price", v);
              onUpdate(line._key, "price_overridden", v !== line.list_price);
            }}
          />
          {line.price_overridden && (
            <span
              title={t("editor.price_overridden")}
              className="absolute top-0.5 start-0.5 h-1.5 w-1.5 rounded-full bg-warning"
            />
          )}
        </div>
      </TableCell>

      {/* Discount */}
      <TableCell className="w-24">
        <Input
          type="number"
          min={0}
          step="0.01"
          className="h-8 text-xs tabular-nums text-start"
          value={line.line_discount}
          onChange={e => onUpdate(line._key, "line_discount", parseFloat(e.target.value) || 0)}
        />
      </TableCell>

      {/* Tax type */}
      <TableCell className="w-32">
        <Select
          value={line.tax_type_id}
          onValueChange={v => onUpdate(line._key, "tax_type_id", v)}
        >
          <SelectTrigger className={cn(
            "h-8 text-xs",
            !line.tax_type_id && "border-danger/60"
          )}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {data.taxTypes.map(tt => (
              <SelectItem key={tt.id} value={tt.id}>
                {lang === "ar" ? tt.name_ar : tt.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Line total */}
      <TableCell className="w-28 text-start tabular-nums text-sm font-medium">
        {formatMoney(lineNet, lang)}
      </TableCell>

      {/* Delete */}
      <TableCell className="w-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-danger"
          onClick={() => onRemove(line._key)}
          aria-label={`remove line ${n}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ── Totals display ───────────────────────────────────────────────

function TotalsDisplay({ totals, lang, t }: {
  totals: LiveTotals;
  lang:   "ar" | "en";
  t:      ReturnType<typeof useTranslation>["t"];
}) {
  const row = (label: string, value: number, bold?: boolean, muted?: boolean) => (
    <div className={cn("flex items-center justify-between py-1.5", muted && "text-muted-foreground")}>
      <span className={cn("text-sm", bold && "font-semibold")}>{label}</span>
      <span className={cn("text-sm tabular-nums", bold && "font-semibold")}>{formatMoney(value, lang)}</span>
    </div>
  );

  return (
    <div className="space-y-0.5">
      {row(t("editor.subtotal"), totals.subtotal, false, true)}
      {totals.total_discount > 0 && row(`– ${t("editor.total_discount")}`, totals.total_discount, false, true)}
      {row(t("editor.taxable_base"), totals.taxable_base)}
      {totals.tax_breakdown.map(b => (
        <div key={b.tax_type_id} className="flex items-center justify-between py-1.5 text-muted-foreground">
          <span className="text-sm">{b.name} ({b.rate}%)</span>
          <span className="text-sm tabular-nums">{formatMoney(b.amount, lang)}</span>
        </div>
      ))}
      {totals.tax_breakdown.length === 0 && (
        <div className="flex items-center justify-between py-1.5 text-muted-foreground">
          <span className="text-sm">{t("editor.tax")}</span>
          <span className="text-sm tabular-nums">{formatMoney(0, lang)}</span>
        </div>
      )}
      <Separator className="my-1" />
      {row(t("editor.grand_total"), totals.grand_total, true)}
    </div>
  );
}

// ── ETA Readiness panel ──────────────────────────────────────────

interface ReadinessPanelProps {
  blockers:        EtaBlocker[];
  canSubmit:       boolean;
  effectiveChannel: "e-invoice" | "e-receipt";
  etaEnvironment:  string;
  isSaving:        boolean;
  isSubmitting:    boolean;
  canCreate:       boolean;
  canSubmitPerm:   boolean;
  onSaveDraft:     () => void;
  onIssue:         () => void;
  onFixBlocker:    (id: string) => void;
  t:               ReturnType<typeof useTranslation>["t"];
  lang:            "ar" | "en";
  /** ETA connector state — when hard-blocked, the notice below supersedes the blocker list. */
  etaHardBlocked:  boolean;
  etaNoticeText:   string | null;
  etaNoticeTone:   "danger" | "warning";
  draftBlocked:    boolean;
  onConnectEta:    () => void;
  connectEtaLabel: string;
}

function ReadinessPanel({
  blockers, canSubmit, effectiveChannel, etaEnvironment,
  isSaving, isSubmitting, canCreate, canSubmitPerm,
  onSaveDraft, onIssue, onFixBlocker, t,
  etaHardBlocked, etaNoticeText, etaNoticeTone, draftBlocked,
  onConnectEta, connectEtaLabel,
}: ReadinessPanelProps) {
  return (
    <div className="space-y-3">
      {/* ETA connector notice — hard block (danger/warning) or warn-only notice */}
      {etaNoticeText && (
        <div className={cn(
          "flex items-start gap-2 rounded px-3 py-2.5",
          etaNoticeTone === "danger" ? "bg-danger-tint text-danger-text" : "bg-warning-tint text-warning-text",
        )}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium">{etaNoticeText}</p>
            <button
              type="button"
              onClick={onConnectEta}
              className="text-xs underline underline-offset-2 inline-flex items-center gap-1"
            >
              {connectEtaLabel}
            </button>
          </div>
        </div>
      )}

      {/* Readiness status — superseded entirely while ETA hard-blocks the document */}
      {etaHardBlocked ? null : canSubmit ? (
        <div className="flex items-start gap-2 rounded bg-success-tint text-success-text px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t("readiness.ready")}</p>
            <p className="text-xs opacity-80">
              {t("editor.will_submit", {
                channel: effectiveChannel === "e-invoice"
                  ? t("editor.channel_einvoice")
                  : t("editor.channel_ereceipt"),
                env: etaEnvironment,
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded border border-border bg-muted/20 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
            <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
            <p className="text-xs font-semibold text-foreground">{t("readiness.title")}</p>
            <Badge variant="outline" className="ms-auto h-5 text-[10px] px-1.5 bg-warning-tint text-warning-text border-transparent">
              {blockers.length}
            </Badge>
          </div>
          <ul className="divide-y divide-border/60">
            {blockers.map(b => (
              <li key={b.id} className="flex items-start justify-between gap-2 px-3 py-2">
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
                  <span className="text-xs text-foreground leading-normal">
                    {t(b.messageKey, b.params)}
                  </span>
                </div>
                {b.isLink ? (
                  <a
                    href="/sales/settings/eta"
                    className="text-xs text-brand underline underline-offset-2 shrink-0 flex items-center gap-0.5"
                  >
                    {t("readiness.eta_settings")}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-brand underline underline-offset-2 shrink-0"
                    onClick={() => onFixBlocker(b.id)}
                  >
                    {t("readiness.fix")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {canCreate && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onSaveDraft}
            disabled={isSaving || isSubmitting || draftBlocked}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("editor.saving")}
              </span>
            ) : t("editor.save_draft")}
          </Button>
        )}
        {canSubmitPerm && (
          <Button
            type="button"
            className="w-full"
            onClick={onIssue}
            disabled={!canSubmit || isSaving || isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("editor.submitting")}
              </span>
            ) : t("editor.issue")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Channel chip ─────────────────────────────────────────────────

function ChannelChip({
  override, effective, onChange, t,
}: {
  override:  Channel;
  effective: "e-invoice" | "e-receipt";
  onChange:  (v: Channel) => void;
  t:         ReturnType<typeof useTranslation>["t"];
}) {
  const label =
    override === "auto"
      ? `${t("editor.channel_auto")}: ${effective === "e-invoice" ? t("editor.channel_einvoice") : t("editor.channel_ereceipt")}`
      : effective === "e-invoice"
      ? t("editor.channel_einvoice")
      : t("editor.channel_ereceipt");

  return (
    <Select value={override} onValueChange={v => onChange(v as Channel)}>
      <SelectTrigger
        className={cn(
          "h-8 gap-1 text-xs font-medium border rounded-full px-3 bg-transparent",
          effective === "e-invoice"
            ? "border-brand/40 text-brand-text bg-brand-tint"
            : "border-success/40 text-success-text bg-success-tint"
        )}
      >
        <SelectValue>{label}</SelectValue>
        <ChevronDown className="h-3 w-3 opacity-60 ms-0.5" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">{t("editor.channel_auto")}</SelectItem>
        <SelectItem value="e-invoice">{t("editor.channel_einvoice")}</SelectItem>
        <SelectItem value="e-receipt">{t("editor.channel_ereceipt")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ── Main page ────────────────────────────────────────────────────

export function InvoiceEditorPage() {
  const navigate     = useNavigate();
  const { t, i18n } = useTranslation("sales");
  const { t: tEta }  = useTranslation("eta");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";
  const can          = useCan();

  const { data, loading, error, isOffline, reload } = useSalesData();
  const { status: connStatus, canIssue, flags: etaFlags } = useEtaConnection();

  // ── Draft state ────────────────────────────────────────────────
  const [draft, setDraft] = useState<InvoiceDraft>({
    customer_id:      "",
    channel_override: "auto",
    date:             today(),
    warehouse_id:     "",
    payment_method_id: "",
    notes:            "",
    lines:            [],
  });

  const [trn, setTrn]             = useState("");
  const [isSaving, setIsSaving]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Refs for fix-focus ─────────────────────────────────────────
  const trnRef       = useRef<HTMLInputElement>(null);
  const customerRef  = useRef<HTMLButtonElement>(null);
  const warehouseRef = useRef<HTMLButtonElement>(null);
  const dateRef      = useRef<HTMLButtonElement>(null);
  const lineAddRef   = useRef<HTMLButtonElement>(null);

  // ── Defaults on data load ──────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    if (!draft.warehouse_id) {
      const def = data.warehouses.find(w => w.is_default);
      if (def) setDraft(d => ({ ...d, warehouse_id: def.id }));
    }
    if (!draft.payment_method_id) {
      const pm = data.paymentMethods[0];
      if (pm) setDraft(d => ({ ...d, payment_method_id: pm.id }));
    }
  // only run on first data load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Derived: customer, channel, totals, blockers ───────────────
  const customer = useMemo(
    () => data?.customers.find(c => c.id === draft.customer_id) ?? null,
    [data?.customers, draft.customer_id]
  );

  const effectiveChannel = useMemo((): "e-invoice" | "e-receipt" => {
    if (draft.channel_override !== "auto") return draft.channel_override as "e-invoice" | "e-receipt";
    return detectChannel(customer);
  }, [draft.channel_override, customer]);

  const isB2B = effectiveChannel === "e-invoice";

  // Pre-fill TRN when customer changes
  useEffect(() => {
    if (customer?.type === "b2b") {
      setTrn(customer.trn ?? "");
    } else {
      setTrn("");
    }
  }, [customer]);

  // Auto-set payment method from customer default
  useEffect(() => {
    if (customer?.default_payment && data) {
      const pm = data.paymentMethods.find(p => p.id === customer.default_payment);
      if (pm) setDraft(d => ({ ...d, payment_method_id: pm.id }));
    }
  }, [customer, data]);

  const totals = useMemo(
    () => computeTotals(draft.lines, data, lang),
    [draft.lines, data, lang]
  );

  const blockers = useMemo((): EtaBlocker[] => {
    const bs: EtaBlocker[] = [];
    if (!draft.customer_id)      bs.push({ id: "no_customer",  messageKey: "readiness.no_customer" });
    if (!draft.date)             bs.push({ id: "no_date",      messageKey: "readiness.no_date" });
    if (!draft.warehouse_id)     bs.push({ id: "no_warehouse", messageKey: "readiness.no_warehouse" });
    if (draft.lines.length === 0) bs.push({ id: "no_lines",    messageKey: "readiness.no_lines" });

    if (isB2B && !isTrnValid(trn)) {
      bs.push({ id: "no_trn", messageKey: "readiness.no_trn" });
    }

    if (data && !data.etaSettings.eseal.configured) {
      bs.push({ id: "no_seal", messageKey: "readiness.no_seal", isLink: true });
    }

    draft.lines.forEach((line, idx) => {
      if (!line.item_id) return;
      const item = data?.items.find(i => i.id === line.item_id);
      if (item && !item.eta_code) {
        const name = lang === "ar" ? item.name_ar : item.name_en;
        bs.push({ id: `no_eta_${line._key}`, messageKey: "readiness.no_eta_code", params: { item: name } });
      }
      if (!line.tax_type_id) {
        bs.push({ id: `no_tax_${line._key}`, messageKey: "readiness.no_tax_type", params: { n: idx + 1 } });
      }
    });

    return bs;
  }, [draft, trn, isB2B, data, lang]);

  // ── ETA connector gating (ETA-1 §1.3) ──────────────────────────
  const blockPolicy   = etaFlags?.block_policy ?? "draft_only";
  const isConnected   = connStatus === "connected";
  const isDisconnectedOrError = connStatus === "disconnected" || connStatus === "error";
  const etaHardBlocked = isDisconnectedOrError && blockPolicy !== "warn_only";
  const etaWarnOnly    = isDisconnectedOrError && blockPolicy === "warn_only";
  const draftBlocked   = blockPolicy === "full_block" && !isConnected;

  const etaNoticeTone: "danger" | "warning" = blockPolicy === "full_block" && etaHardBlocked ? "danger" : "warning";
  const etaNoticeText = etaHardBlocked
    ? tEta(blockPolicy === "full_block" ? "warnings.full_block_blocked" : "warnings.draft_only_blocked")
    : etaWarnOnly ? tEta("warnings.warn_only_notice") : null;

  const showEtaBanner = isDisconnectedOrError
    && (etaFlags?.connect_entrypoints ?? []).includes("banner");

  // Document-level blockers are superseded while the connector hard-blocks the document.
  const effectiveBlockers = etaHardBlocked ? [] : blockers;
  const canSubmitNow = canIssue && effectiveBlockers.length === 0;

  // ── Line handlers ──────────────────────────────────────────────
  const addLine = useCallback(() => {
    setDraft(d => ({ ...d, lines: [...d.lines, newLine()] }));
  }, []);

  const removeLine = useCallback((key: string) => {
    setDraft(d => ({ ...d, lines: d.lines.filter(l => l._key !== key) }));
  }, []);

  const updateLine = useCallback((key: string, field: keyof InvoiceLine, value: unknown) => {
    setDraft(d => ({
      ...d,
      lines: d.lines.map(l => l._key !== key ? l : { ...l, [field]: value }),
    }));
  }, []);

  const selectItemInLine = useCallback((key: string, itemId: string) => {
    if (!data) return;
    const item = data.items.find(i => i.id === itemId);
    if (!item) return;
    const listPrice = getItemListPrice(item, customer);
    setDraft(d => ({
      ...d,
      lines: d.lines.map(l => l._key !== key ? l : {
        ...l,
        item_id:         itemId,
        description:     lang === "ar" ? item.name_ar : item.name_en,
        uom_id:          item.base_uom_id,
        price:           listPrice,
        list_price:      listPrice,
        price_overridden: false,
        tax_type_id:     item.tax_type_id,
      }),
    }));
  }, [data, customer, lang]);

  // ── Fix-focus handler ──────────────────────────────────────────
  const handleFixBlocker = useCallback((id: string) => {
    if (id === "no_customer")  { customerRef.current?.focus();  customerRef.current?.click(); }
    if (id === "no_warehouse") { warehouseRef.current?.focus(); warehouseRef.current?.click(); }
    if (id === "no_trn")       { trnRef.current?.focus(); }
    if (id === "no_date")      { dateRef.current?.focus(); }
    if (id === "no_lines")     { lineAddRef.current?.focus(); lineAddRef.current?.click(); }
    // For per-line blockers we just scroll to the lines zone
    if (id.startsWith("no_eta_") || id.startsWith("no_tax_")) {
      document.getElementById("lines-zone")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    await new Promise<void>(r => setTimeout(r, 700));
    setIsSaving(false);
    toast.success(t("editor.saved_draft"));
  }, [t]);

  const issueAndSubmit = useCallback(async () => {
    if (!canSubmitNow) return;
    setIsSubmitting(true);
    await new Promise<void>(r => setTimeout(r, 1000));
    setIsSubmitting(false);
    toast.success(isB2B ? t("editor.submitted_b2b") : t("editor.submitted_b2c"));
    navigate("/sales/invoices");
  }, [canSubmitNow, isB2B, t, navigate]);

  // ── Branch label derived from selected warehouse ───────────────
  const branchName = useMemo(() => {
    const wh = data?.warehouses.find(w => w.id === draft.warehouse_id);
    const br = data?.branches.find(b => b.id === wh?.branch_id);
    return br ? (lang === "ar" ? br.name_ar : br.name_en) : "—";
  }, [data, draft.warehouse_id, lang]);

  // ── Helper: line has a blocker ─────────────────────────────────
  const lineHasBlocker = useCallback((lineKey: string): boolean => {
    return blockers.some(b => b.id === `no_eta_${lineKey}` || b.id === `no_tax_${lineKey}`);
  }, [blockers]);

  // ── Loading skeleton ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 pb-8">
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-7 w-44" />
        </div>
        <PageSection title={t("editor.zone_header")} padded={false}>
          <HeaderZoneSkeleton />
        </PageSection>
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div id="lines-zone" className="flex-1 min-w-0">
            <PageSection title={t("editor.zone_lines")} padded={false}>
              <GridSkeleton />
            </PageSection>
          </div>
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <PageSection title={t("editor.zone_totals")}>
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                ))}
              </div>
            </PageSection>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (error && !data) {
    return (
      <PageSection>
        <ErrorState onRetry={reload} />
      </PageSection>
    );
  }

  if (!data) return null;

  // ── Editor ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title={t("editor.title_new")}
        crumbLabel={t("editor.title_new")}
        actions={
          <ChannelChip
            override={draft.channel_override}
            effective={effectiveChannel}
            onChange={v => setDraft(d => ({ ...d, channel_override: v }))}
            t={t}
          />
        }
        alert={(isOffline || showEtaBanner) ? (
          <div className="space-y-2">
            {isOffline && <OfflineBanner />}
            {showEtaBanner && <EtaConnectBanner />}
          </div>
        ) : undefined}
      />

      {/* ── Zone 1 — Header ─────────────────────────────────────── */}
      <PageSection title={t("editor.zone_header")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Customer */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label className="text-sm font-medium">
              {t("editor.customer")} <span className="text-danger" aria-hidden>*</span>
            </label>
            <Select
              value={draft.customer_id}
              onValueChange={v => setDraft(d => ({ ...d, customer_id: v }))}
            >
              <SelectTrigger ref={customerRef}>
                <SelectValue placeholder={t("editor.select_customer")} />
              </SelectTrigger>
              <SelectContent>
                {data.customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span>
                      {lang === "ar" ? c.name_ar : c.name_en}
                      {c.type === "b2b" && c.trn && (
                        <span className="ms-2 text-xs text-muted-foreground ltr:inline-block">{c.trn}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TRN — only for B2B */}
          {isB2B && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="trn-field">
                {t("editor.trn")} <span className="text-danger" aria-hidden>*</span>
              </label>
              <Input
                id="trn-field"
                ref={trnRef}
                value={trn}
                onChange={e => setTrn(e.target.value)}
                placeholder="000000000"
                maxLength={9}
                className={cn(
                  "tabular-nums",
                  trn && !isTrnValid(trn) && "border-danger focus-visible:ring-danger/30"
                )}
                dir="ltr"
              />
              {trn && !isTrnValid(trn) && (
                <p className="text-xs text-danger-text">{t("readiness.no_trn")}</p>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="inv-date">
              {t("editor.date")} <span className="text-danger" aria-hidden>*</span>
            </label>
            <DatePicker
              id="inv-date"
              ref={dateRef}
              value={draft.date}
              onChange={val => setDraft(d => ({ ...d, date: val }))}
            />
          </div>

          {/* Warehouse */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("editor.warehouse")} <span className="text-danger" aria-hidden>*</span>
            </label>
            <Select
              value={draft.warehouse_id}
              onValueChange={v => setDraft(d => ({ ...d, warehouse_id: v }))}
            >
              <SelectTrigger ref={warehouseRef}>
                <SelectValue placeholder={t("editor.select_warehouse")} />
              </SelectTrigger>
              <SelectContent>
                {data.warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {lang === "ar" ? w.name_ar : w.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch (readonly, derived) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t("editor.branch")}</label>
            <div className="h-10 px-3 flex items-center rounded border border-input bg-muted/30 text-sm text-muted-foreground">
              {branchName}
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("editor.payment_method")}</label>
            <Select
              value={draft.payment_method_id}
              onValueChange={v => setDraft(d => ({ ...d, payment_method_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("editor.select_payment")} />
              </SelectTrigger>
              <SelectContent>
                {data.paymentMethods.map(pm => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {lang === "ar" ? pm.name_ar : pm.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium" htmlFor="inv-notes">{t("editor.notes")}</label>
            <textarea
              id="inv-notes"
              rows={2}
              value={draft.notes}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              className="w-full resize-none rounded border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </PageSection>

      {/* ── Zone 2 + 3 ──────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* Zone 2 — Line grid */}
        <div id="lines-zone" className="flex-1 min-w-0">
        <PageSection
          className="flex-1 min-w-0"
          title={t("editor.zone_lines")}
          padded={false}
          actions={
            <Button
              ref={lineAddRef}
              type="button"
              size="sm"
              variant="outline"
              onClick={addLine}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("editor.add_item")}
            </Button>
          }
        >
          {draft.lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
              <p className="text-sm">{t("editor.no_items")}</p>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("editor.add_item")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_item")}</TableHead>
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_desc")}</TableHead>
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_qty")}</TableHead>
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_uom")}</TableHead>
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_price")}</TableHead>
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_discount")}</TableHead>
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_tax")}</TableHead>
                    <TableHead className="text-start font-semibold uppercase tracking-wider text-[10px]">{t("editor.col_total")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.lines.map((line, idx) => (
                    <LineRow
                      key={line._key}
                      line={line}
                      idx={idx}
                      data={data}
                      customer={customer}
                      lang={lang}
                      t={t}
                      onUpdate={updateLine}
                      onSelectItem={selectItemInLine}
                      onRemove={removeLine}
                      hasBlocker={lineHasBlocker(line._key)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageSection>
        </div>

        {/* Zone 3 — Totals + Readiness rail */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">

          {/* Totals */}
          <PageSection title={t("editor.zone_totals")}>
            <TotalsDisplay totals={totals} lang={lang} t={t} />
          </PageSection>

          {/* ETA Readiness + actions */}
          <PageSection>
            <ReadinessPanel
              blockers={effectiveBlockers}
              canSubmit={canSubmitNow}
              effectiveChannel={effectiveChannel}
              etaEnvironment={data.etaSettings.environment}
              isSaving={isSaving}
              isSubmitting={isSubmitting}
              canCreate={can("sales.invoice.create")}
              canSubmitPerm={can("sales.invoice.submit")}
              onSaveDraft={saveDraft}
              onIssue={issueAndSubmit}
              onFixBlocker={handleFixBlocker}
              t={t}
              lang={lang}
              etaHardBlocked={etaHardBlocked}
              etaNoticeText={etaNoticeText}
              etaNoticeTone={etaNoticeTone}
              draftBlocked={draftBlocked}
              onConnectEta={() => navigate("/sales/settings/eta")}
              connectEtaLabel={tEta("connection.cta_connect")}
            />
          </PageSection>
        </div>
      </div>
    </div>
  );
}
