import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";

import { DatePicker } from "@/components/patterns/DatePicker";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

function newLine() {
  return { _key: `${Date.now()}-${Math.random()}`, account: "", dr: "", cr: "", memo: "" };
}

interface JournalEntryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalEntryCreateModal({ open, onOpenChange }: JournalEntryCreateModalProps) {
  const { t, i18n } = useTranslation("finance");
  const lang = (i18n.language.startsWith("ar") ? "ar" : "en") as "ar" | "en";

  const [date, setDate]   = useState(new Date().toISOString().split("T")[0]);
  const [memo, setMemo]   = useState("");
  const [lines, setLines] = useState([newLine(), newLine()]);
  const [saving, setSaving] = useState(false);

  const totalDr = lines.reduce((s, l) => s + (parseFloat(l.dr) || 0), 0);
  const totalCr = lines.reduce((s, l) => s + (parseFloat(l.cr) || 0), 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  function onClose() {
    onOpenChange(false);
  }

  async function handleSave() {
    if (!balanced || !memo.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
    toast.success(t("journal.saved_toast"));
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={o => !o && onClose()}
      title={t("journal.form_title")}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button disabled={!balanced || !memo.trim() || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("journal.form_date")} *</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">{t("journal.form_memo")} *</Label>
              <Input value={memo} onChange={e => setMemo(e.target.value)} />
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs w-28">{t("journal.form_account")}</TableHead>
                  <TableHead className="text-xs">{t("journal.lines_memo")}</TableHead>
                  <TableHead className="text-xs w-28">{t("journal.form_dr")}</TableHead>
                  <TableHead className="text-xs w-28">{t("journal.form_cr")}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(line => (
                  <TableRow key={line._key}>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 text-xs font-mono"
                        value={line.account}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, account: e.target.value } : l))}
                        placeholder="1101"
                        dir="ltr"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        className="h-8 text-xs"
                        value={line.memo}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, memo: e.target.value } : l))}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number" min={0} step="0.01"
                        className="h-8 text-xs tabular-nums text-start"
                        value={line.dr}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, dr: e.target.value, cr: e.target.value ? "" : l.cr } : l))}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number" min={0} step="0.01"
                        className="h-8 text-xs tabular-nums text-start"
                        value={line.cr}
                        onChange={e => setLines(prev => prev.map(l => l._key === line._key ? { ...l, cr: e.target.value, dr: e.target.value ? "" : l.dr } : l))}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="p-1 w-8">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-danger"
                        onClick={() => setLines(prev => prev.filter(l => l._key !== line._key))}
                        disabled={lines.length <= 2}
                      >×</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <Button
                variant="ghost" size="sm"
                className="text-xs text-muted-foreground gap-1"
                onClick={() => setLines(prev => [...prev, newLine()])}
              >
                {t("journal.form_add_line")}
              </Button>
              <div className="flex items-center gap-4 text-xs tabular-nums">
                <span className={cn(totalDr > 0 && "font-medium")}>
                  {t("journal.form_total_dr")}: {formatMoney(totalDr, lang)}
                </span>
                <span className={cn(totalCr > 0 && "font-medium")}>
                  {t("journal.form_total_cr")}: {formatMoney(totalCr, lang)}
                </span>
              </div>
            </div>
          </div>

          {!balanced && (totalDr > 0 || totalCr > 0) && (
            <p className="text-xs text-danger flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" />
              {t("journal.form_unbalanced")}
            </p>
          )}
        </div>
    </ModalShell>
  );
}
