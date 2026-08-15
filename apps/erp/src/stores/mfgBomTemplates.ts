import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBomTemplates } from "@/lib/mock/mfg";
import type { BomTemplate, BomComponent, MfgOverhead } from "@/types/mfg";

export interface SaveTemplateInput {
  output_item_id: string;
  name_ar: string;
  name_en: string;
  ref_qty: number;
  overhead_default: MfgOverhead;
  components: BomComponent[];
  stages_template: string[];
}

const SEED_TEMPLATES: Record<string, BomTemplate> = Object.fromEntries(
  getBomTemplates().map((t) => [t.id, t])
);

let seq = 1;
function nextId(): string {
  return `bom_${Date.now()}_${seq++}`;
}

interface MfgBomTemplatesState {
  templates: Record<string, BomTemplate>;
  /** First save of a brand-new template (from /mfg/bom/new). */
  createTemplate: (input: SaveTemplateInput) => BomTemplate;
  /** Save in place — never touches any MO's Order BOM (FE_14 §11.4: those are frozen
   * copies taken at MO-creation time, never a live reference to this template). */
  updateTemplate: (id: string, input: SaveTemplateInput) => void;
  /** "Clone" row action from the list — an independent, deep-copied template (never a
   * shared reference to the source). The editor's "Save as copy" doesn't call this: it
   * already has the full form state, so it just calls `createTemplate` directly. */
  cloneTemplate: (id: string) => BomTemplate | null;
  toggleArchive: (id: string) => void;
}

export const useMfgBomTemplates = create<MfgBomTemplatesState>()(
  persist(
    (set, get) => ({
      templates: SEED_TEMPLATES,

      createTemplate: (input) => {
        const tpl: BomTemplate = { id: nextId(), status: "active", ...input };
        set((s) => ({ templates: { ...s.templates, [tpl.id]: tpl } }));
        return tpl;
      },

      updateTemplate: (id, input) => set((s) => {
        const existing = s.templates[id];
        if (!existing) return s;
        return { templates: { ...s.templates, [id]: { ...existing, ...input } } };
      }),

      cloneTemplate: (id) => {
        const source = get().templates[id];
        if (!source) return null;
        const copy: BomTemplate = {
          ...source,
          id: nextId(),
          name_ar: `${source.name_ar} (نسخة)`,
          name_en: `${source.name_en} (Copy)`,
          status: "active",
          components: source.components.map((c) => ({ ...c })),
          stages_template: [...source.stages_template],
        };
        set((s) => ({ templates: { ...s.templates, [copy.id]: copy } }));
        return copy;
      },

      toggleArchive: (id) => set((s) => {
        const existing = s.templates[id];
        if (!existing) return s;
        const status = existing.status === "active" ? "archived" : "active";
        return { templates: { ...s.templates, [id]: { ...existing, status } } };
      }),
    }),
    { name: "flexova.mfg.bomTemplates" }
  )
);
