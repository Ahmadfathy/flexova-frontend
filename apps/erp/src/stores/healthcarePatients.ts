import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPatients, getOwners } from "@/lib/mock/healthcare";
import type { HcPatient, HcOwner } from "@/features/healthcare/types";

/**
 * Patient + Owner/Guarantor working set (spec §5). Seeded from the fixture,
 * then every add/quick-add/veterinary-create writes back here — mirrors the
 * `useHealthcareClinical` convention from Prompt 2 (single live source once a
 * screen starts mutating data, static fixture accessors stay read-only).
 */

let localSeq = 0;
function nextLocalId(prefix: string): string {
  localSeq += 1;
  return `${prefix}_local_${localSeq}`;
}

/** Egyptian mobile format (spec §2 validation: "phone ✱ Egyptian format"). */
export const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;

function seedPatients(): Record<string, HcPatient> {
  return Object.fromEntries(getPatients().map((p) => [p.id, p]));
}
function seedOwners(): Record<string, HcOwner> {
  return Object.fromEntries(getOwners().map((o) => [o.id, o]));
}

function nextCode(prefix: "P" | "V", patients: Record<string, HcPatient>): string {
  const base = prefix === "P" ? 1001 : 2001;
  const nums = Object.values(patients)
    .map((p) => p.code)
    .filter((c) => c.startsWith(`${prefix}-`))
    .map((c) => Number(c.slice(2)))
    .filter((n) => Number.isFinite(n) && n >= base);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : base;
  return `${prefix}-${next}`;
}

export interface NewHumanPatientInput {
  name_ar: string;
  phone: string;
  dob: string | null;
  sex: "male" | "female" | null;
  blood_type: string | null;
  allergies: string[];
  chronic: string[];
  insurance: { payer_id: string; plan_id: string } | null;
  /** Pediatric branch (spec §5.2/§5.5 — guardian "active" instead of hidden "self"). */
  guardian?: { name_ar: string; phone: string };
}

export interface NewAnimalInput {
  name_ar: string;
  species: string;
  breed: string;
  weight_kg: number | null;
}

interface HealthcarePatientsState {
  patients: Record<string, HcPatient>;
  owners: Record<string, HcOwner>;

  findPatientByPhone: (phone: string) => HcPatient | undefined;
  findOwnerByPhone: (phone: string) => HcOwner | undefined;

  /** Full "New patient" page (spec §5.2) — human path, self or parent-guardian. */
  addPatient: (input: NewHumanPatientInput) => HcPatient;
  /** <15s quick-add modal (spec §5.4) — phone+name only, rest completed at first visit. */
  addQuickPatient: (phone: string, name_ar: string) => HcPatient;
  /** Veterinary path (spec §5.5) — owner is the dedupe key, then 1:many animals. */
  addOwnerAndAnimal: (owner: { name_ar: string; phone: string }, animal: NewAnimalInput) => { owner: HcOwner; patient: HcPatient };
  addAnimalToOwner: (ownerId: string, animal: NewAnimalInput) => HcPatient;
  updatePatient: (id: string, patch: Partial<HcPatient>) => void;
}

export const useHealthcarePatients = create<HealthcarePatientsState>()(
  persist(
    (set, get) => ({
      patients: seedPatients(),
      owners: seedOwners(),

      findPatientByPhone: (phone) => Object.values(get().patients).find((p) => p.phone === phone),
      findOwnerByPhone: (phone) => Object.values(get().owners).find((o) => o.phone === phone),

      addPatient: (input) => {
        const s = get();
        let ownerId = "own_self";
        if (input.guardian) {
          const existingGuardian = Object.values(s.owners).find((o) => o.phone === input.guardian!.phone);
          if (existingGuardian) {
            ownerId = existingGuardian.id;
          } else {
            const newOwnerId = nextLocalId("own");
            const owner: HcOwner = { id: newOwnerId, relationship: "parent", name_ar: input.guardian.name_ar, phone: input.guardian.phone };
            set((st) => ({ owners: { ...st.owners, [newOwnerId]: owner } }));
            ownerId = newOwnerId;
          }
        }
        const id = nextLocalId("pt");
        const patient: HcPatient = {
          id, code: nextCode("P", s.patients), name_ar: input.name_ar, name_en: input.name_ar,
          phone: input.phone, dob: input.dob, sex: input.sex, blood_type: input.blood_type,
          allergies: input.allergies, chronic: input.chronic, owner_id: ownerId,
          insurance: input.insurance, specialty_ext: {}, last_visit: null, status: "active",
        };
        set((st) => ({ patients: { ...st.patients, [id]: patient } }));
        return patient;
      },

      addQuickPatient: (phone, name_ar) => {
        const s = get();
        const id = nextLocalId("pt");
        const patient: HcPatient = {
          id, code: nextCode("P", s.patients), name_ar, name_en: name_ar,
          phone, dob: null, sex: null, blood_type: null,
          allergies: [], chronic: [], owner_id: "own_self",
          insurance: null, specialty_ext: {}, last_visit: null, status: "active",
        };
        set((st) => ({ patients: { ...st.patients, [id]: patient } }));
        return patient;
      },

      addOwnerAndAnimal: (ownerInput, animal) => {
        const s = get();
        let owner = Object.values(s.owners).find((o) => o.phone === ownerInput.phone);
        if (!owner) {
          const ownerId = nextLocalId("own");
          owner = { id: ownerId, relationship: "owner", name_ar: ownerInput.name_ar, phone: ownerInput.phone };
          set((st) => ({ owners: { ...st.owners, [ownerId]: owner! } }));
        }
        const patient = get().addAnimalToOwner(owner.id, animal);
        return { owner, patient };
      },

      addAnimalToOwner: (ownerId, animal) => {
        const s = get();
        const id = nextLocalId("pt");
        const patient: HcPatient = {
          id, code: nextCode("V", s.patients), name_ar: animal.name_ar, name_en: animal.name_ar,
          phone: null, dob: null, sex: null, blood_type: null,
          allergies: [], chronic: [], owner_id: ownerId,
          insurance: null,
          specialty_ext: { species: animal.species, breed: animal.breed, weight_kg: animal.weight_kg ?? undefined },
          last_visit: null, status: "active",
        };
        set((st) => ({ patients: { ...st.patients, [id]: patient } }));
        return patient;
      },

      updatePatient: (id, patch) => {
        set((s) => {
          const p = s.patients[id];
          if (!p) return s;
          return { patients: { ...s.patients, [id]: { ...p, ...patch } } };
        });
      },
    }),
    { name: "flexova.healthcare.patients" }
  )
);
