import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { ModalShell } from "@/components/patterns/ModalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHealthcarePatients, EGYPT_PHONE_RE } from "@/stores/healthcarePatients";
import { useAppearance } from "@/stores/appearance";
import { ownerName } from "@/lib/mock/healthcare";
import type { HcPatient, HcOwner } from "@/features/healthcare/types";

interface VeterinaryAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Skip the owner step (spec §5.5 "＋حيوان" from an owner already on screen). */
  initialOwner?: HcOwner;
  onCreated?: (patient: HcPatient) => void;
}

/**
 * Veterinary path (spec §5.5) — owner first (phone+name, the dedupe key),
 * then "＋حيوان" (species/name/breed). Owner is 1:many animals; billing/comm
 * bind to the owner, encounter/diagnosis bind to the animal.
 */
export function VeterinaryAddDialog({ open, onOpenChange, initialOwner, onCreated }: VeterinaryAddDialogProps) {
  const { t } = useTranslation("healthcare");
  const { lang } = useAppearance();
  const findOwnerByPhone = useHealthcarePatients((s) => s.findOwnerByPhone);
  const addOwnerAndAnimal = useHealthcarePatients((s) => s.addOwnerAndAnimal);
  const addAnimalToOwner = useHealthcarePatients((s) => s.addAnimalToOwner);

  const [step, setStep] = useState<"owner" | "animal">(initialOwner ? "animal" : "owner");
  const [ownerPhone, setOwnerPhone] = useState(initialOwner?.phone ?? "");
  const [ownerName_, setOwnerName_] = useState(initialOwner?.name_ar ?? "");
  const [resolvedOwner, setResolvedOwner] = useState<HcOwner | undefined>(initialOwner);

  const [animalName, setAnimalName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [weight, setWeight] = useState("");

  const ownerMatch = ownerPhone.length >= 10 ? findOwnerByPhone(ownerPhone) : undefined;

  function reset() {
    setStep(initialOwner ? "animal" : "owner");
    setOwnerPhone(initialOwner?.phone ?? ""); setOwnerName_(initialOwner?.name_ar ?? ""); setResolvedOwner(initialOwner);
    setAnimalName(""); setSpecies(""); setBreed(""); setWeight("");
  }

  function handleOwnerNext() {
    if (!EGYPT_PHONE_RE.test(ownerPhone)) {
      toast.error(t("patients.quickadd_bad_phone"));
      return;
    }
    if (!ownerMatch && !ownerName_.trim()) {
      toast.error(t("patients.vet_missing_owner_name"));
      return;
    }
    setResolvedOwner(ownerMatch);
    setStep("animal");
  }

  function handleSaveAnimal() {
    if (!animalName.trim() || !species.trim()) {
      toast.error(t("patients.vet_missing_animal_fields"));
      return;
    }
    const animalInput = {
      name_ar: animalName.trim(), species: species.trim(), breed: breed.trim(),
      weight_kg: weight.trim() ? Number(weight) : null,
    };

    if (resolvedOwner) {
      const patient = addAnimalToOwner(resolvedOwner.id, animalInput);
      toast.success(t("patients.vet_success"));
      onCreated?.(patient);
    } else {
      const { patient } = addOwnerAndAnimal({ name_ar: ownerName_.trim(), phone: ownerPhone }, animalInput);
      toast.success(t("patients.vet_success"));
      onCreated?.(patient);
    }
    reset();
    onOpenChange(false);
  }

  const footer = step === "owner" ? (
    <>
      <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
      <Button onClick={handleOwnerNext}>
        {t("patients.vet_next")} <ArrowLeft className="h-3.5 w-3.5 ms-1.5 rtl:hidden" />
        <ArrowRight className="h-3.5 w-3.5 ms-1.5 ltr:hidden" />
      </Button>
    </>
  ) : (
    <>
      {!initialOwner && (
        <Button variant="ghost" onClick={() => setStep("owner")}>{t("patients.vet_back")}</Button>
      )}
      <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
      <Button onClick={handleSaveAnimal}>{t("common:save")}</Button>
    </>
  );

  return (
    <ModalShell
      open={open}
      onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}
      title={step === "owner" ? t("patients.vet_owner_title") : t("patients.vet_animal_title")}
      size="sm"
      footer={footer}
    >
      {step === "owner" ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("patients.field_phone")}</Label>
            <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" inputMode="tel" />
          </div>
          {ownerMatch ? (
            <p className="text-xs text-brand-text flex items-center gap-1.5 rounded-lg bg-brand-tint border border-brand/20 p-3">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t("patients.vet_owner_found", { name: ownerName(ownerMatch, lang) })}
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label>{t("patients.vet_owner_name")}</Label>
              <Input value={ownerName_} onChange={(e) => setOwnerName_(e.target.value)} placeholder={t("patients.field_name_placeholder")} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {resolvedOwner && (
            <p className="text-xs text-muted-foreground">{t("patients.vet_owner_label")}: <span className="font-medium text-foreground">{ownerName(resolvedOwner, lang)}</span></p>
          )}
          <div className="space-y-1.5">
            <Label>{t("patients.vet_animal_name")}</Label>
            <Input value={animalName} onChange={(e) => setAnimalName(e.target.value)} placeholder={t("patients.vet_animal_name_placeholder")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("patients.vet_species")}</Label>
              <Input value={species} onChange={(e) => setSpecies(e.target.value)} placeholder={t("patients.vet_species_placeholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("patients.vet_breed")}</Label>
              <Input value={breed} onChange={(e) => setBreed(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("patients.vet_weight")}</Label>
            <Input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="tabular-nums" />
          </div>
        </div>
      )}
    </ModalShell>
  );
}
