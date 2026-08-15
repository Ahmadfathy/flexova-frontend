import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHealthcareCatalog } from "@/stores/healthcareCatalog";

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** CSV import (spec §9.2/§9.6 — "parses+dedupes"). Columns: name_ar,type,price,default_provider. */
export function CsvImportModal({ open, onOpenChange }: CsvImportModalProps) {
  const { t } = useTranslation("healthcare");
  const importCsv = useHealthcareCatalog((s) => s.importCsv);
  const [text, setText] = useState("");

  function handleImport() {
    if (!text.trim()) {
      toast.error(t("catalog.import_empty"));
      return;
    }
    const result = importCsv(text);
    toast.success(t("catalog.import_result", { added: result.added, deduped: result.deduped }));
    setText("");
    onOpenChange(false);
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={(o) => { if (!o) setText(""); onOpenChange(o); }}
      title={t("catalog.import_title")}
      description={t("catalog.import_hint")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleImport}>{t("catalog.import_cta")}</Button>
        </>
      }
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        dir="ltr"
        placeholder={"name_ar,type,price,default_provider\nصورة دم كاملة,lab,180,tech_lab"}
        className="font-mono text-xs"
      />
    </ModalShell>
  );
}
