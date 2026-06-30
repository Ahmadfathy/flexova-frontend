import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DrawerShell } from "@/components/patterns/DrawerShell";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  Download, Upload, CheckCircle2, XCircle, Loader2, FileSpreadsheet,
  ArrowLeft, ArrowRight, X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { InventoryFixture } from "./types";

/* ─── Steps ──────────────────────────────────────────────────── */

const STEPS = ["step_download", "step_validate", "step_confirm", "step_result"] as const;
type Step = typeof STEPS[number];

/* ─── Props ──────────────────────────────────────────────────── */

interface ImportDrawerProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  data:         InventoryFixture | null;
}

/* ─── Component ──────────────────────────────────────────────── */

export function ImportDrawer({ open, onOpenChange, data }: ImportDrawerProps) {
  const { t, i18n } = useTranslation("inventory");
  const lang         = (i18n.language === "ar" ? "ar" : "en") as "ar" | "en";

  const columns    = data?.import_template_columns ?? [];
  const sampleResult = data?.import_sample_result ?? { valid: 0, errors: [] };
  const sampleErrors = sampleResult.errors as Array<{
    row: number;
    reason_ar: string;
    reason_en: string;
  }>;

  const [step,      setStep]      = useState<Step>("step_download");
  const [file,      setFile]      = useState<File | null>(null);
  const [dragging,  setDragging]  = useState(false);
  const [fileError, setFileError] = useState("");
  const [tab,       setTab]       = useState<"valid" | "errors">("valid");
  const [importing, setImporting] = useState(false);
  const [, setImportDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("step_download");
    setFile(null);
    setFileError("");
    setTab("valid");
    setImporting(false);
    setImportDone(false);
    setDragging(false);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  /* ── File handling ───────────────────────────────────────── */

  function acceptFile(f: File) {
    const ok = f.name.endsWith(".xlsx") || f.name.endsWith(".csv");
    if (!ok) { setFileError(t("import_wizard.file_type_error")); return; }
    setFileError("");
    setFile(f);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  }

  /* ── Navigation ──────────────────────────────────────────── */

  function nextStep() {
    const idx = STEPS.indexOf(step);
    if (step === "step_download" && !file) {
      setFileError(t("import_wizard.no_file"));
      return;
    }
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function prevStep() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  async function handleImport() {
    setImporting(true);
    await new Promise(r => setTimeout(r, 1400));
    setImporting(false);
    setImportDone(true);
    setStep("step_result");
  }

  /* ── Step indicator ──────────────────────────────────────── */

  const stepIdx = STEPS.indexOf(step);

  /* ── Render ──────────────────────────────────────────────── */

  const BackIcon    = lang === "ar" ? ArrowRight : ArrowLeft;
  const ForwardIcon = lang === "ar" ? ArrowLeft  : ArrowRight;

  return (
    <DrawerShell
      open={open}
      onOpenChange={handleClose}
      title={t("import_wizard.title")}
      description={t("actions.import")}
      size="lg"
      className="sm:max-w-2xl"
      footer={
        step !== "step_result" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={stepIdx === 0 ? handleClose : prevStep}
            >
              {stepIdx === 0
                ? t("actions.cancel")
                : (<><BackIcon className="h-4 w-4 me-1" />{t("import_wizard.back_step")}</>)}
            </Button>

            {step === "step_confirm" ? (
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
                {importing ? t("import_wizard.importing") : t("import_wizard.step_result")}
              </Button>
            ) : (
              <Button onClick={nextStep}>
                {t("import_wizard.next")}
                <ForwardIcon className="h-4 w-4 ms-1" />
              </Button>
            )}
          </>
        ) : (
          <Button className="ms-auto" onClick={handleClose}>
            {t("import_wizard.done")}
          </Button>
        )
      }
    >
        {/* Step indicator */}
        <div className="shrink-0 -mx-6 -mt-4 px-6 pt-4 pb-3 border-b border-border bg-muted/20 mb-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 min-w-0">
                <div className={cn(
                  "flex items-center justify-center rounded-full w-6 h-6 text-xs font-semibold shrink-0 transition-colors",
                  i < stepIdx
                    ? "bg-primary text-primary-foreground"
                    : i === stepIdx
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                )}>
                  {i < stepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs whitespace-nowrap hidden sm:block",
                  i === stepIdx ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {t(`import_wizard.${s}`)}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="h-px w-4 bg-border shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4">

          {/* ── Step 1: Download + Upload ── */}
          {step === "step_download" && (
            <div className="space-y-6">
              {/* Download template */}
              <div className="rounded border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-semibold">{t("import_wizard.download_tpl")}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("import_wizard.download_hint")}
                </p>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        {columns.map(col => (
                          <th
                            key={col.key}
                            className="border border-border px-2 py-1 text-start font-semibold whitespace-nowrap"
                          >
                            {lang === "ar" ? col.label_ar : col.label_en}
                            {col.required && <span className="text-destructive ms-1">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {columns.map(col => (
                          <td
                            key={col.key}
                            className="border border-border px-2 py-1 text-muted-foreground italic"
                          >
                            ...
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 me-1.5" />
                  {t("import_wizard.download_tpl")}
                </Button>
              </div>

              {/* Upload */}
              <div className="space-y-2">
                <span className="text-sm font-semibold block">{t("import_wizard.step_upload")}</span>

                {file ? (
                  <div className="flex items-center gap-3 rounded border border-primary/40 bg-primary/5 px-4 py-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => { setFile(null); setFileError(""); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
                      dragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t("import_wizard.upload_hint")}
                    </p>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={onInputChange}
                />

                {fileError && (
                  <p className="text-xs text-destructive">{fileError}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Validate & preview ── */}
          {step === "step_validate" && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {t("import_wizard.valid", { n: sampleResult.valid })}
                  </span>
                </div>
                {sampleErrors.length > 0 && (
                  <div className="flex items-center gap-2 rounded border border-destructive/20 bg-destructive/5 px-3 py-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm font-medium text-destructive">
                      {t("import_wizard.errors", { n: sampleErrors.length })}
                    </span>
                  </div>
                )}
              </div>

              {/* Tab toggle */}
              {sampleErrors.length > 0 && (
                <div className="flex gap-1 border-b border-border">
                  {(["valid", "errors"] as const).map(t_ => (
                    <button
                      key={t_}
                      onClick={() => setTab(t_)}
                      className={cn(
                        "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                        tab === t_
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t(`import_wizard.${t_}_tab`)}
                    </button>
                  ))}
                </div>
              )}

              {/* Valid rows preview */}
              {tab === "valid" && (
                <div className="rounded border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        {columns.slice(0, 4).map(col => (
                          <TableHead
                            key={col.key}
                            className="h-9 px-3 py-2 text-xs font-semibold text-muted-foreground"
                          >
                            {lang === "ar" ? col.label_ar : col.label_en}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ["أرز بسمتي ٥ كجم", "Rice 5kg", "GR-2001", "stocked"],
                        ["مكرونة ريحانة ٥٠٠ جم", "Pasta 500g", "GR-2002", "stocked"],
                        ["زيت نخلة ١ لتر", "Palm oil 1L", "OL-3001", "stocked"],
                      ].map((row, i) => (
                        <TableRow key={i} className="border-b border-border last:border-0">
                          {row.slice(0, 4).map((cell, j) => (
                            <TableCell key={j} className="px-3 py-2 text-sm">{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="px-3 py-2 text-xs text-muted-foreground text-center"
                        >
                          {lang === "ar"
                            ? `... و ${sampleResult.valid - 3} صفاً أخرى`
                            : `... and ${sampleResult.valid - 3} more rows`}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Error rows */}
              {tab === "errors" && (
                <div className="rounded border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 px-3 py-2 text-xs font-semibold text-muted-foreground">
                          {t("import_wizard.row_num")}
                        </TableHead>
                        <TableHead className="h-9 px-3 py-2 text-xs font-semibold text-muted-foreground">
                          {lang === "ar" ? "السبب" : "Reason"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleErrors.map((err, i) => (
                        <TableRow key={i} className="border-b border-border last:border-0">
                          <TableCell className="px-3 py-2 text-sm tabular-nums w-16">
                            {err.row}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-sm text-destructive">
                            {lang === "ar" ? err.reason_ar : err.reason_en}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === "step_confirm" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="h-16 w-16 rounded bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="text-base font-medium">
                {t("import_wizard.confirm_msg", { n: sampleResult.valid })}
              </p>
              {sampleErrors.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("import_wizard.errors", { n: sampleErrors.length })}
                  {" "}
                  {lang === "ar" ? "ستُتخطَّى" : "will be skipped"}
                </p>
              )}
            </div>
          )}

          {/* ── Step 4: Result ── */}
          {step === "step_result" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="h-16 w-16 rounded bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-base font-semibold text-foreground">
                {t("import_wizard.result_success", { n: sampleResult.valid })}
              </p>
              {sampleErrors.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("import_wizard.result_failed", { n: sampleErrors.length })}
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 me-1.5" />
                    {t("import_wizard.download_errors")}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
    </DrawerShell>
  );
}
