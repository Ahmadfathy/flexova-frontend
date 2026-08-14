import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patientName } from "@/lib/mock/healthcare";
import type { HcPatient } from "@/features/healthcare/types";

interface AnimalSwitcherProps {
  currentId: string;
  siblings: HcPatient[];
  lang: "ar" | "en";
}

/** Veterinary "switch among owner's animals" (spec §6.2). */
export function AnimalSwitcher({ currentId, siblings, lang }: AnimalSwitcherProps) {
  const navigate = useNavigate();
  if (siblings.length <= 1) return null;

  return (
    <Select value={currentId} onValueChange={(id) => navigate(`/healthcare/patients/${id}`)}>
      <SelectTrigger className="h-8 w-auto min-w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        {siblings.map((p) => (
          <SelectItem key={p.id} value={p.id}>{patientName(p, lang)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
