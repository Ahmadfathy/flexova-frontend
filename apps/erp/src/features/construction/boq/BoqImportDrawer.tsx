import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Upload } from "lucide-react";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BoqItemFormInput } from "@/stores/constructionStore";

interface BoqImportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseLabel: string;
  onImport: (rows: BoqItemFormInput[]) => number;
}

type Step = "paste" | "preview" | "result";
const STEPS: Step[] = ["paste", "preview", "result"];

interface ParsedRow {
  description_ar: string;
  unit_ar: string;
  estimated_qty: number;
  unit_price: number;
  estimated_unit_cost: number;
}

/** Splits a CSV line on commas, respecting simple double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { cells.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string, hasHeader: boolean): { rows: ParsedRow[]; error: boolean } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: ParsedRow[] = [];
  for (const line of dataLines) {
    const cells = splitCsvLine(line);
    if (cells.length < 3) continue;
    const [description_ar, unit_ar, qtyStr, priceStr, costStr] = cells;
    const estimated_qty = Number(qtyStr) || 0;
    const unit_price = Number(priceStr) || 0;
    const estimated_unit_cost = Number(costStr) || 0;
    if (!description_ar) continue;
    rows.push({ description_ar, unit_ar: unit_ar ?? "", estimated_qty, unit_price, estimated_unit_cost });
  }
  return { rows, error: dataLines.length > 0 && rows.length === 0 };
}

export function BoqImportDrawer({ open, onOpenChange, phaseLabel, onImport }: BoqImportDrawerProps) {
  const { t } = useTranslation("construction");

  const [step, setStep] = useState<Step>("paste");
  const [text, setText] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [importedCount, setImportedCount] = useState(0);

  const { rows, error } = useMemo(() => parseCsv(text, hasHeader), [text, hasHeader]);
  const stepIdx = STEPS.indexOf(step);

  function reset() {
    setStep("paste");
    setText("");
    setHasHeader(true);
    setImportedCount(0);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  function handleConfirm() {
    const count = onImport(rows.map((r) => ({
      phase_ref: "", // filled by caller
      code: "",
      section_header_ar: "",
      description_ar: r.description_ar,
      unit_ar: r.unit_ar,
      estimated_qty: r.estimated_qty,
      unit_price: r.unit_price,
      estimated_unit_cost: r.estimated_unit_cost,
    })));
    setImportedCount(count);
    setStep("result");
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={handleClose}
      title={t("boq_import.title")}
      description={phaseLabel}
      size="lg"
      footer={
        step === "result" ? (
          <Button className="ms-auto" onClick={handleClose}>{t("common:close")}</Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={stepIdx === 0 ? handleClose : () => setStep("paste")}>
              {stepIdx === 0 ? t("common:cancel") : t("boq_import.back")}
            </Button>
            {step === "paste" ? (
              <Button onClick={() => setStep("preview")} disabled={!text.trim() || error}>
                {t("boq_import.next")}
              </Button>
            ) : (
              <Button onClick={handleConfirm} disabled={rows.length === 0}>
                {t("boq_import.confirm_import", { n: rows.length })}
              </Button>
            )}
          </>
        )
      }
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 -mt-1 mb-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex items-center justify-center rounded-full w-6 h-6 text-xs font-semibold shrink-0",
              i < stepIdx ? "bg-primary text-primary-foreground" : i === stepIdx ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"
            )}>
              {i < stepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn("text-xs whitespace-nowrap hidden sm:block", i === stepIdx ? "text-foreground font-medium" : "text-muted-foreground")}>
              {t(`boq_import.step_${s}`)}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border shrink-0" />}
          </div>
        ))}
      </div>

      {step === "paste" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("boq_import.paste_hint")}</p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            dir="ltr"
            className="font-mono text-xs"
            placeholder={"دهانات,م²,5000,70,48\nأرضيات,م²,2000,350,260"}
          />
          <div className="flex items-center gap-2">
            <Switch id="has-header" checked={hasHeader} onCheckedChange={setHasHeader} />
            <Label htmlFor="has-header" className="text-sm">{t("boq_import.step_paste")} — {t("boq.description")}, {t("boq.unit")}, {t("boq.qty")}, {t("boq.unit_price")}, {t("boq.est_cost")}</Label>
          </div>
          {error && <p className="text-xs text-danger-text">{t("boq_import.parse_error")}</p>}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("boq_import.rows_detected", { n: rows.length })}</p>
          <p className="text-xs text-muted-foreground">{t("boq_import.map_hint")}</p>
          <div className="rounded border border-border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-3 py-2 text-xs font-semibold">{t("boq_import.col_description")}</TableHead>
                  <TableHead className="h-9 px-3 py-2 text-xs font-semibold">{t("boq_import.col_unit")}</TableHead>
                  <TableHead className="h-9 px-3 py-2 text-xs font-semibold tabular-nums">{t("boq_import.col_qty")}</TableHead>
                  <TableHead className="h-9 px-3 py-2 text-xs font-semibold tabular-nums">{t("boq_import.col_price")}</TableHead>
                  <TableHead className="h-9 px-3 py-2 text-xs font-semibold tabular-nums">{t("boq_import.col_cost")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className="border-b border-border last:border-0">
                    <TableCell className="px-3 py-2 text-sm">{r.description_ar}</TableCell>
                    <TableCell className="px-3 py-2 text-sm">{r.unit_ar}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums">{r.estimated_qty}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums">{r.unit_price}</TableCell>
                    <TableCell className="px-3 py-2 text-sm tabular-nums">{r.estimated_unit_cost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="h-16 w-16 rounded bg-success-tint flex items-center justify-center">
            <Upload className="h-8 w-8 text-success-text" />
          </div>
          <p className="text-base font-semibold">{t("boq_import.imported_success", { n: importedCount })}</p>
        </div>
      )}
    </DrawerShell>
  );
}
