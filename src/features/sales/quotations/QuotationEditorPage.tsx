import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader }    from "@/components/patterns/PageHeader";
import { PageSection }   from "@/components/patterns/PageSection";
import { ErrorState }    from "@/components/patterns/ErrorState";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { StatusPill, type PillVariant } from "@/components/patterns/StatusPill";
import { Skeleton }      from "@/components/patterns/Skeletons";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  Plus, Trash2, ArrowRightLeft, Send, Save, ChevronLeft, Info,
} from "lucide-react";

import { formatMoney, formatDate } from "@/lib/format";
import { useCan } from "@/lib/permissions";
import {
  useSalesData,
  type QuotationStatus,
} from "@/features/sales/invoices/useSalesData";

// ── Types ──────────────────────────────────────────────────────────

interface QuoteLine {
  _key: string;
  item_id: string;
  qty: number;
  uom_id: string;
  price: number;
}

interface QuoteDraft {
  customer_id: string;
  date: string;
  valid_until: string;
  notes: string;
  status: QuotationStatus;
  lines: QuoteLine[];
}

function newKey() {
  return Math.random().toString(36).slice(2);
}

function quotePillVariant(s: QuotationStatus): PillVariant {
  if (s === "accepted") return "approved";
  if (s === "sent")     return "active";
  if (s === "draft")    return "default";
  if (s === "rejected") return "rejected";
  if (s === "expired")  return "inactive";
  return "default";
}

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

// ── Line row ──────────────────────────────────────────────────────

interface LineRowProps {
  line: QuoteLine;
  lang: "ar" | "en";
  items: { id: string; name_ar: string; name_en: string; tax_type_id: string; prices: Record<string, number> }[];
  uoms:  { id: string; name_ar: string; name_en: string }[];
  priceListId: string;
  taxTypes: { id: string; rate: number }[];
  readonly?: boolean;
  onChange: (line: QuoteLine) => void;
  onRemove: () => void;
}

function LineRow({
  line, lang, items, uoms, priceListId, taxTypes,
  readonly, onChange, onRemove,
}: LineRowProps) {
  const { t } = useTranslation("sales");

  const item    = items.find(i => i.id === line.item_id);
  const taxRate = taxTypes.find(tt => tt.id === item?.tax_type_id)?.rate ?? 14;

  function handleItemChange(itemId: string) {
    const newItem = items.find(i => i.id === itemId);
    const price   = newItem?.prices[priceListId] ?? 0;
    const uom     = uoms[0]?.id ?? "";
    onChange({
      ...line,
      item_id: itemId,
      uom_id: newItem ? uom : "",
      price,
    });
  }

  const lineTotal = line.qty * line.price * (1 + taxRate / 100);

  return (
    <TableRow>
      <TableCell className="py-2 w-52">
        {readonly ? (
          <span className="text-sm">{lang === "ar" ? item?.name_ar : item?.name_en}</span>
        ) : (
          <Select value={line.item_id} onValueChange={handleItemChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t("editor.select_item")} />
            </SelectTrigger>
            <SelectContent>
              {items.map(it => (
                <SelectItem key={it.id} value={it.id}>
                  {lang === "ar" ? it.name_ar : it.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className="py-2 w-24">
        {readonly ? (
          <span className="text-sm tabular-nums">{line.qty}</span>
        ) : (
          <Input
            type="number" min={1} value={line.qty}
            onChange={e => onChange({ ...line, qty: Math.max(1, +e.target.value) })}
            className="h-8 text-center tabular-nums w-20"
          />
        )}
      </TableCell>
      <TableCell className="py-2 w-28">
        {readonly ? (
          <span className="text-sm">{lang === "ar" ? uoms.find(u => u.id === line.uom_id)?.name_ar : uoms.find(u => u.id === line.uom_id)?.name_en}</span>
        ) : (
          <Select value={line.uom_id} onValueChange={v => onChange({ ...line, uom_id: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {uoms.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {lang === "ar" ? u.name_ar : u.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className="py-2 w-32">
        {readonly ? (
          <span className="text-sm tabular-nums">{line.price.toFixed(2)}</span>
        ) : (
          <Input
            type="number" min={0} step={0.01} value={line.price}
            onChange={e => onChange({ ...line, price: Math.max(0, +e.target.value) })}
            className="h-8 text-end tabular-nums w-28"
          />
        )}
      </TableCell>
      <TableCell className="py-2 text-end tabular-nums text-sm font-medium w-32">
        {formatMoney(lineTotal, lang)}
      </TableCell>
      {!readonly && (
        <TableCell className="py-2 w-10">
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="size-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

// ── Totals ────────────────────────────────────────────────────────

function computeTotals(
  lines: QuoteLine[],
  items: { id: string; tax_type_id: string }[],
  taxTypes: { id: string; rate: number }[],
) {
  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    if (!line.item_id) continue;
    const item = items.find(i => i.id === line.item_id);
    const rate = taxTypes.find(t => t.id === item?.tax_type_id)?.rate ?? 14;
    const base = line.qty * line.price;
    subtotal += base;
    tax += base * (rate / 100);
  }
  return { subtotal, tax, grand_total: subtotal + tax };
}

// ── Page ──────────────────────────────────────────────────────────

export function QuotationEditorPage() {
  const { t, i18n } = useTranslation("sales");
  const lang   = i18n.language as "ar" | "en";
  const nav    = useNavigate();
  const { id } = useParams<{ id: string }>();
  const can        = useCan();
  const canConvert = can("invoice");

  const { data, loading, error, isOffline, reload } = useSalesData();

  // ── Resolve existing quotation ──────────────────────────────────

  const existing = id ? (data?.quotations ?? []).find(q => q.id === id) : null;

  const initDraft = useCallback((): QuoteDraft => {
    if (existing) {
      return {
        customer_id: existing.customer_id,
        date:        existing.date,
        valid_until: existing.valid_until,
        notes:       "",
        status:      existing.status,
        lines:       existing.lines.map(l => ({ ...l, _key: newKey() })),
      };
    }
    return {
      customer_id: "",
      date:        TODAY,
      valid_until: THIRTY_DAYS,
      notes:       "",
      status:      "draft",
      lines:       [],
    };
  }, [existing]);

  const [draft, setDraft] = useState<QuoteDraft>(initDraft);
  const [saving, setSaving] = useState(false);

  const items      = data?.items     ?? [];
  const uoms       = data?.uoms      ?? [];
  const taxTypes   = data?.taxTypes  ?? [];
  const customers  = data?.customers  ?? [];

  const priceListId = customers.find(c => c.id === draft.customer_id)?.price_list_id ?? "";

  const totals = useMemo(
    () => computeTotals(draft.lines, items, taxTypes),
    [draft.lines, items, taxTypes],
  );

  function addLine() {
    setDraft(d => ({
      ...d,
      lines: [...d.lines, { _key: newKey(), item_id: "", qty: 1, uom_id: uoms[0]?.id ?? "", price: 0 }],
    }));
  }

  function updateLine(key: string, line: QuoteLine) {
    setDraft(d => ({ ...d, lines: d.lines.map(l => l._key === key ? line : l) }));
  }

  function removeLine(key: string) {
    setDraft(d => ({ ...d, lines: d.lines.filter(l => l._key !== key) }));
  }

  async function handleSaveDraft() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    toast.success(t("quote.saved_draft"));
    nav("/sales/quotations");
  }

  async function handleSend() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success(t("quote.sent"));
    nav("/sales/quotations");
  }

  async function handleConvert() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    toast.success(t("quote.converted"));
    nav("/sales/invoices/new");
  }

  async function handleMarkAccepted() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    toast.success(t("quote.mark_accepted"));
    nav("/sales/quotations");
  }

  async function handleMarkRejected() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    toast.success(t("quote.mark_rejected"));
    nav("/sales/quotations");
  }

  // ── States ─────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-96 w-full" />
    </div>
  );

  if (error) return <ErrorState description={error} onRetry={reload} />;

  if (id && !existing) return <Navigate to="/sales/quotations" replace />;

  const readonly = existing
    ? !["draft", "sent"].includes(existing.status)
    : false;

  const pageTitle = id
    ? (lang === "ar" ? `عرض ${existing?.number ?? ""}` : `Quote ${existing?.number ?? ""}`)
    : t("quote.title_new");

  return (
    <div className="flex flex-col gap-6 min-h-screen">
      {isOffline && <OfflineBanner />}

      <PageHeader
        title={pageTitle}
        actions={
          <div className="flex items-center gap-2">
            {existing && (
              <StatusPill
                variant={quotePillVariant(existing.status)}
                label={t(`quote.status_${existing.status}`)}
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => nav("/sales/quotations")}>
              <ChevronLeft className="size-4 me-1" />
              {t("quote.title")}
            </Button>
          </div>
        }
      />

      <div className="flex gap-6 flex-1 items-start px-0">

        {/* ── Zone 1 + 2 ── main content */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Zone 1 — header form */}
          <PageSection title={t("quote.zone_header")}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>{t("editor.customer")}</Label>
                {readonly ? (
                  <p className="text-sm font-medium">
                    {(() => {
                      const c = customers.find(c => c.id === draft.customer_id);
                      return lang === "ar" ? c?.name_ar : c?.name_en;
                    })()}
                  </p>
                ) : (
                  <Select
                    value={draft.customer_id}
                    onValueChange={v => setDraft(d => ({ ...d, customer_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("editor.select_customer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {lang === "ar" ? c.name_ar : c.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("editor.date")}</Label>
                {readonly ? (
                  <p className="text-sm">{formatDate(draft.date)}</p>
                ) : (
                  <Input
                    type="date"
                    value={draft.date}
                    onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("quote.valid_until")}</Label>
                {readonly ? (
                  <p className="text-sm">{formatDate(draft.valid_until)}</p>
                ) : (
                  <Input
                    type="date"
                    value={draft.valid_until}
                    onChange={e => setDraft(d => ({ ...d, valid_until: e.target.value }))}
                  />
                )}
              </div>

              <div className="col-span-2 space-y-2">
                <Label>{t("quote.notes")}</Label>
                {readonly ? (
                  <p className="text-sm text-muted-foreground">{draft.notes || "—"}</p>
                ) : (
                  <Textarea
                    rows={2}
                    value={draft.notes}
                    onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  />
                )}
              </div>
            </div>
          </PageSection>

          {/* Zone 2 — lines */}
          <PageSection title={t("quote.zone_lines")} padded={false}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t("editor.col_item")}</TableHead>
                  <TableHead className="text-start">{t("editor.col_qty")}</TableHead>
                  <TableHead className="text-start">{t("editor.col_uom")}</TableHead>
                  <TableHead className="text-start">{t("editor.col_price")}</TableHead>
                  <TableHead className="text-end">{t("editor.col_total")}</TableHead>
                  {!readonly && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.lines.map(line => (
                  <LineRow
                    key={line._key}
                    line={line}
                    lang={lang}
                    items={items}
                    uoms={uoms}
                    taxTypes={taxTypes}
                    priceListId={priceListId}
                    readonly={readonly}
                    onChange={l => updateLine(line._key, l)}
                    onRemove={() => removeLine(line._key)}
                  />
                ))}
              </TableBody>
            </Table>
            {!readonly && (
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addLine}
                  disabled={!draft.customer_id}
                >
                  <Plus className="size-4 me-1.5" />
                  {t("editor.add_item")}
                </Button>
              </div>
            )}
          </PageSection>
        </div>

        {/* ── Zone 3 — right rail (totals + actions) */}
        <aside className="w-80 shrink-0 space-y-4 sticky top-6">

          {/* Totals */}
          <PageSection title={t("quote.zone_totals")}>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("editor.subtotal")}</dt>
                <dd className="tabular-nums font-medium">{formatMoney(totals.subtotal, lang)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("editor.tax")}</dt>
                <dd className="tabular-nums font-medium">{formatMoney(totals.tax, lang)}</dd>
              </div>
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <dt>{t("editor.grand_total")}</dt>
                <dd className="tabular-nums">{formatMoney(totals.grand_total, lang)}</dd>
              </div>
            </dl>
          </PageSection>

          {/* No-ETA notice */}
          <div className="border rounded-lg p-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30">
            <Info className="size-3 mt-0.5 shrink-0" />
            {t("quote.no_eta")}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {draft.status === "draft" && !id && (
              <>
                <Button className="w-full" onClick={handleSend} disabled={saving || !draft.customer_id || draft.lines.length === 0}>
                  <Send className="size-4 me-1.5" />
                  {saving ? "…" : t("quote.send")}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSaveDraft} disabled={saving}>
                  <Save className="size-4 me-1.5" />
                  {t("quote.save_draft")}
                </Button>
              </>
            )}

            {existing?.status === "draft" && (
              <>
                <Button className="w-full" onClick={handleSend} disabled={saving}>
                  <Send className="size-4 me-1.5" />
                  {saving ? "…" : t("quote.send")}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSaveDraft} disabled={saving}>
                  <Save className="size-4 me-1.5" />
                  {t("quote.save_draft")}
                </Button>
              </>
            )}

            {existing?.status === "sent" && (
              <>
                <Button variant="outline" className="w-full" onClick={handleMarkAccepted} disabled={saving}>
                  {saving ? "…" : t("quote.mark_accepted")}
                </Button>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleMarkRejected} disabled={saving}>
                  {t("quote.mark_rejected")}
                </Button>
              </>
            )}

            {existing?.status === "accepted" && canConvert && (
              <Button className="w-full" onClick={handleConvert} disabled={saving}>
                <ArrowRightLeft className="size-4 me-1.5" />
                {saving ? "…" : t("quote.convert")}
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
