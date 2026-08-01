import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getProjects, getProjectClients, getMilestones as getFixtureMilestones, getRetainers,
  getTimeEntries as getFixtureTimeEntries, getExpenses as getFixtureExpenses,
  getProjectEmployee, getRoleRate,
} from "@/lib/mock/projects";
import { useProjectsAudit } from "@/stores/projectsAudit";
import { CURRENT_EMPLOYEE_ID } from "@/features/projects/currentUser";
import { resolveRate } from "@/features/projects/time/rateResolution";
import type {
  Project, ProjectClient, Milestone, Retainer, ProjectStatus, BillingModel, TeamMember,
  TimeEntry, Expense,
} from "@/features/projects/types";

const SEED_PROJECTS: Record<string, Project> = Object.fromEntries(getProjects().map((p) => [p.id, p]));
const SEED_CLIENTS: Record<string, ProjectClient> = Object.fromEntries(getProjectClients().map((c) => [c.id, c]));
const SEED_MILESTONES: Record<string, Milestone> = Object.fromEntries(getFixtureMilestones().map((m) => [m.id, m]));
const SEED_RETAINERS: Record<string, Retainer> = Object.fromEntries(getRetainers().map((r) => [r.id, r]));
const SEED_TIME_ENTRIES: Record<string, TimeEntry> = Object.fromEntries(getFixtureTimeEntries().map((e) => [e.id, e]));
const SEED_EXPENSES: Record<string, Expense> = Object.fromEntries(getFixtureExpenses().map((e) => [e.id, e]));

let seq = 1;

function nextCode(projects: Record<string, Project>, typeLabel: string): string {
  const prefix = typeLabel === "case" ? "CASE" : "PRJ";
  const year = new Date().getFullYear();
  const max = Object.values(projects).reduce((m, p) => {
    const match = p.code.match(/(\d+)$/);
    const n = match ? parseInt(match[1], 10) : NaN;
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(3, "0")}`;
}

export interface CreateMilestoneInput {
  sequence: number;
  name_ar: string;
  name_en: string;
  billing_type: Milestone["billing_type"];
  fixed_amount: number | null;
  hours_estimated: number | null;
  target_date: string | null;
}

export interface CreateProjectInput {
  client_id: string;
  title_ar: string;
  title_en: string;
  type_label: string;
  billing_model: BillingModel;
  team: TeamMember[];
  milestones: CreateMilestoneInput[];
  budget_estimated: number | null;
  hours_estimated: number | null;
  start_date: string;
  target_end: string | null;
  /** Only meaningful when billing_model === "retainer" — links a Retainer immediately so Activate isn't blocked. */
  retainer_opening_amount?: number | null;
}

export type ActivateResult = { ok: true } | { ok: false; reason: "retainer_required" | "not_found" };

export interface MilestoneFormInput {
  name_ar: string;
  name_en: string;
  billing_type: Milestone["billing_type"];
  fixed_amount: number | null;
  hours_estimated: number | null;
  target_date: string | null;
  notes?: string;
}

function projectRequester(project: Project): string {
  const lead = project.team.find((m) => m.project_role.toLowerCase().includes("lead"));
  return lead?.employee_id ?? project.team[0]?.employee_id ?? CURRENT_EMPLOYEE_ID;
}

export interface ManualTimeEntryInput {
  project_id: string;
  milestone_id: string | null;
  date: string;
  manual_minutes: number;
  description_ar: string;
  billable: boolean;
}

export interface TimerStopInput {
  project_id: string;
  milestone_id: string | null;
  date: string;
  start_ts: string;
  stop_ts: string;
  description_ar: string;
  billable: boolean;
}

export interface TimeEntryEditInput {
  project_id: string;
  milestone_id: string | null;
  date: string;
  manual_minutes: number | null;
  description_ar: string;
  billable: boolean;
}

export type TimeApprovalResult =
  | { ok: true }
  | { ok: false; reason: "self_approval" | "not_submitted" };

export interface ExpenseFormInput {
  description_ar: string;
  amount: number;
  billable: boolean;
  markup: number;
  milestone_id: string | null;
  stock_item_id?: string | null;
}

interface ProjectsState {
  projects: Record<string, Project>;
  clients: Record<string, ProjectClient>;
  milestones: Record<string, Milestone>;
  retainers: Record<string, Retainer>;
  time_entries: Record<string, TimeEntry>;
  expenses: Record<string, Expense>;
  /** Entries/expenses created while `?mock=offline` — cleared on the next reconcile (kickoff §7.6: queue + idempotent reconcile). */
  pendingSyncIds: string[];

  addClient: (input: Omit<ProjectClient, "id">) => ProjectClient;
  createProject: (input: CreateProjectInput) => Project;
  activateProject: (id: string) => ActivateResult;
  holdProject: (id: string) => void;
  closeProject: (id: string) => void;
  cloneProject: (id: string) => Project | null;

  addMilestone: (projectId: string, input: MilestoneFormInput) => Milestone;
  updateMilestone: (id: string, input: MilestoneFormInput) => void;
  requestMilestoneApproval: (id: string) => void;
  /** Approve is never blocked by SoD (kickoff invariant #7: warn + append-only audit, not a hard block). */
  approveMilestone: (id: string) => { ok: true; sodWarning: boolean } | { ok: false };
  deleteMilestone: (id: string) => void;
  reorderMilestones: (projectId: string, orderedIds: string[]) => void;

  addManualTimeEntry: (input: ManualTimeEntryInput, offline?: boolean) => TimeEntry;
  addTimerTimeEntry: (input: TimerStopInput, offline?: boolean) => TimeEntry;
  updateTimeEntry: (id: string, input: TimeEntryEditInput) => void;
  submitTimeEntries: (ids: string[]) => void;
  /** SoD guard (kickoff invariant #7): blocked, not just warned, when approver === entry owner — logs an append-only audit entry either way. */
  approveTimeEntry: (id: string) => TimeApprovalResult;
  rejectTimeEntry: (id: string, reason: string) => void;
  bulkApproveTimeEntries: (ids: string[]) => { approvedCount: number; blockedCount: number };

  addExpense: (projectId: string, input: ExpenseFormInput, offline?: boolean) => Expense;
  updateExpense: (id: string, input: ExpenseFormInput) => void;

  reconcilePendingSync: () => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      clients: SEED_CLIENTS,
      milestones: SEED_MILESTONES,
      retainers: SEED_RETAINERS,
      time_entries: SEED_TIME_ENTRIES,
      expenses: SEED_EXPENSES,
      pendingSyncIds: [],

      addClient: (input) => {
        const client: ProjectClient = { id: `cl_${Date.now()}_${seq++}`, ...input };
        set((s) => ({ clients: { ...s.clients, [client.id]: client } }));
        return client;
      },

      createProject: (input) => {
        const state = get();
        const id = `prj_${Date.now()}_${seq++}`;
        let retainer_id: string | undefined;

        if (input.billing_model === "retainer" && (input.retainer_opening_amount ?? 0) > 0) {
          const amount = input.retainer_opening_amount as number;
          const retainer: Retainer = {
            id: `ret_${Date.now()}_${seq++}`,
            client_id: input.client_id,
            project_id: id,
            opening_amount: amount,
            balance: amount,
            low_threshold: Math.round(amount * 0.15),
            draws: [],
          };
          set((s) => ({ retainers: { ...s.retainers, [retainer.id]: retainer } }));
          retainer_id = retainer.id;
        }

        const project: Project = {
          id,
          code: nextCode(state.projects, input.type_label),
          title_ar: input.title_ar,
          title_en: input.title_en,
          type_label: input.type_label,
          client_id: input.client_id,
          status: "draft",
          billing_model: input.billing_model,
          scope_ar: "",
          team: input.team,
          budget_estimated: input.budget_estimated,
          hours_estimated: input.hours_estimated,
          start_date: input.start_date,
          target_end: input.target_end,
          actual_end: null,
          retainer_id,
          actuals_view: { hours_actual: 0, cost_actual: 0, revenue_invoiced: 0, margin_est: 0 },
        };

        const newMilestones: Record<string, Milestone> = {};
        input.milestones.forEach((m, i) => {
          const mId = `ms_${Date.now()}_${seq++}_${i}`;
          newMilestones[mId] = { id: mId, project_id: id, state: "draft", ...m };
        });

        set((s) => ({
          projects: { ...s.projects, [id]: project },
          milestones: { ...s.milestones, ...newMilestones },
        }));

        return project;
      },

      activateProject: (id) => {
        const project = get().projects[id];
        if (!project) return { ok: false, reason: "not_found" };
        if (project.billing_model === "retainer" && !project.retainer_id) {
          return { ok: false, reason: "retainer_required" };
        }
        set((s) => ({ projects: { ...s.projects, [id]: { ...project, status: "active" as ProjectStatus } } }));
        return { ok: true };
      },

      holdProject: (id) => set((s) => {
        const p = s.projects[id];
        if (!p || p.status !== "active") return s;
        return { projects: { ...s.projects, [id]: { ...p, status: "on_hold" } } };
      }),

      closeProject: (id) => set((s) => {
        const p = s.projects[id];
        if (!p || p.status === "closed" || p.status === "archived" || p.status === "cancelled") return s;
        return { projects: { ...s.projects, [id]: { ...p, status: "closed", actual_end: new Date().toISOString().slice(0, 10) } } };
      }),

      cloneProject: (id) => {
        const source = get().projects[id];
        if (!source) return null;
        const newId = `prj_${Date.now()}_${seq++}`;

        const copy: Project = {
          ...source,
          id: newId,
          code: nextCode(get().projects, source.type_label),
          status: "draft",
          start_date: new Date().toISOString().slice(0, 10),
          target_end: null,
          actual_end: null,
          retainer_id: undefined,
          actuals_view: { hours_actual: 0, cost_actual: 0, revenue_invoiced: 0, margin_est: 0 },
        };

        const sourceMilestones = Object.values(get().milestones).filter((m) => m.project_id === id);
        const newMilestones: Record<string, Milestone> = {};
        sourceMilestones.forEach((m, i) => {
          const mId = `ms_${Date.now()}_${seq++}_${i}`;
          newMilestones[mId] = { ...m, id: mId, project_id: newId, state: "draft" };
        });

        set((s) => ({
          projects: { ...s.projects, [newId]: copy },
          milestones: { ...s.milestones, ...newMilestones },
        }));

        return copy;
      },

      addMilestone: (projectId, input) => {
        const siblings = Object.values(get().milestones).filter((m) => m.project_id === projectId);
        const sequence = siblings.reduce((max, m) => Math.max(max, m.sequence), 0) + 1;
        const id = `ms_${Date.now()}_${seq++}`;
        const milestone: Milestone = { id, project_id: projectId, sequence, state: "draft", ...input };
        set((s) => ({ milestones: { ...s.milestones, [id]: milestone } }));
        return milestone;
      },

      updateMilestone: (id, input) => set((s) => {
        const m = s.milestones[id];
        if (!m) return s;
        return { milestones: { ...s.milestones, [id]: { ...m, ...input } } };
      }),

      requestMilestoneApproval: (id) => set((s) => {
        const m = s.milestones[id];
        const project = m ? s.projects[m.project_id] : undefined;
        if (!m || !project || m.state !== "draft") return s;
        return {
          milestones: {
            ...s.milestones,
            [id]: { ...m, state: "in_progress", requested_by: projectRequester(project) },
          },
        };
      }),

      approveMilestone: (id) => {
        const m = get().milestones[id];
        if (!m || m.state !== "in_progress") return { ok: false };

        const sodWarning = !!m.requested_by && m.requested_by === CURRENT_EMPLOYEE_ID;
        set((s) => ({ milestones: { ...s.milestones, [id]: { ...m, state: "approved" } } }));

        if (sodWarning) {
          useProjectsAudit.getState().append({
            user: CURRENT_EMPLOYEE_ID,
            action: "projects.milestone.self_approved",
            entity: id,
            detail_ar: `اعتماد ذاتي: نفس الشخص طلب واعتمد المرحلة ${m.name_ar}`,
            detail_en: `Self-approval: the same person requested and approved milestone ${m.name_en}`,
          });
        }

        return { ok: true, sodWarning };
      },

      deleteMilestone: (id) => set((s) => {
        const m = s.milestones[id];
        if (!m || m.state !== "draft") return s;
        const { [id]: _removed, ...rest } = s.milestones;
        return { milestones: rest };
      }),

      reorderMilestones: (projectId, orderedIds) => set((s) => {
        const updated = { ...s.milestones };
        orderedIds.forEach((mid, i) => {
          const m = updated[mid];
          if (m && m.project_id === projectId) updated[mid] = { ...m, sequence: i + 1 };
        });
        return { milestones: updated };
      }),

      addManualTimeEntry: (input, offline) => {
        const id = `te_${Date.now()}_${seq++}`;
        const entry: TimeEntry = {
          id,
          project_id: input.project_id,
          milestone_id: input.milestone_id,
          employee_id: CURRENT_EMPLOYEE_ID,
          date: input.date,
          source: "manual",
          start_ts: null,
          stop_ts: null,
          manual_minutes: input.manual_minutes,
          description_ar: input.description_ar,
          billable: input.billable,
          state: "draft",
          rate_resolved: null,
          rate_source: null,
          invoiced: false,
          invoice_id: null,
        };
        set((s) => ({
          time_entries: { ...s.time_entries, [id]: entry },
          pendingSyncIds: offline ? [...s.pendingSyncIds, id] : s.pendingSyncIds,
        }));
        return entry;
      },

      addTimerTimeEntry: (input, offline) => {
        const id = `te_${Date.now()}_${seq++}`;
        const entry: TimeEntry = {
          id,
          project_id: input.project_id,
          milestone_id: input.milestone_id,
          employee_id: CURRENT_EMPLOYEE_ID,
          date: input.date,
          source: "timer",
          start_ts: input.start_ts,
          stop_ts: input.stop_ts,
          manual_minutes: null,
          description_ar: input.description_ar,
          billable: input.billable,
          state: "draft",
          rate_resolved: null,
          rate_source: null,
          invoiced: false,
          invoice_id: null,
        };
        set((s) => ({
          time_entries: { ...s.time_entries, [id]: entry },
          pendingSyncIds: offline ? [...s.pendingSyncIds, id] : s.pendingSyncIds,
        }));
        return entry;
      },

      updateTimeEntry: (id, input) => set((s) => {
        const e = s.time_entries[id];
        if (!e || e.state !== "draft") return s;
        return {
          time_entries: {
            ...s.time_entries,
            [id]: {
              ...e,
              project_id: input.project_id,
              milestone_id: input.milestone_id,
              date: input.date,
              description_ar: input.description_ar,
              billable: input.billable,
              // Timer-origin duration stays timestamp-derived — manual_minutes only applies to manual entries.
              manual_minutes: e.source === "manual" ? input.manual_minutes : e.manual_minutes,
            },
          },
        };
      }),

      submitTimeEntries: (ids) => set((s) => {
        const updated = { ...s.time_entries };
        ids.forEach((id) => {
          const e = updated[id];
          if (e && e.state === "draft" && e.employee_id === CURRENT_EMPLOYEE_ID) {
            updated[id] = { ...e, state: "submitted" };
          }
        });
        return { time_entries: updated };
      }),

      approveTimeEntry: (id) => {
        const e = get().time_entries[id];
        if (!e || e.state !== "submitted") return { ok: false, reason: "not_submitted" };

        if (e.employee_id === CURRENT_EMPLOYEE_ID) {
          useProjectsAudit.getState().append({
            user: CURRENT_EMPLOYEE_ID,
            action: "projects.time.self_approval_blocked",
            entity: id,
            detail_ar: `تم منع اعتماد ذاتي لساعات: ${e.description_ar || id}`,
            detail_en: `Blocked self-approval attempt on time entry: ${e.description_ar || id}`,
          });
          return { ok: false, reason: "self_approval" };
        }

        const project = get().projects[e.project_id];
        const employee = getProjectEmployee(e.employee_id);
        const resolved = resolveRate(project, employee, getRoleRate);
        const rate_resolved = e.billable ? resolved.rate : null;
        const rate_source = e.billable ? resolved.source : null;

        set((s) => ({
          time_entries: { ...s.time_entries, [id]: { ...e, state: "approved", rate_resolved, rate_source } },
        }));
        return { ok: true };
      },

      rejectTimeEntry: (id, reason) => set((s) => {
        const e = s.time_entries[id];
        if (!e || e.state !== "submitted") return s;
        return { time_entries: { ...s.time_entries, [id]: { ...e, state: "rejected", reject_reason: reason } } };
      }),

      bulkApproveTimeEntries: (ids) => {
        let approvedCount = 0;
        let blockedCount = 0;
        ids.forEach((id) => {
          const result = get().approveTimeEntry(id);
          if (result.ok) approvedCount++;
          else if (result.reason === "self_approval") blockedCount++;
        });
        return { approvedCount, blockedCount };
      },

      addExpense: (projectId, input, offline) => {
        const id = `ex_${Date.now()}_${seq++}`;
        const expense: Expense = {
          id,
          project_id: projectId,
          milestone_id: input.milestone_id,
          description_ar: input.description_ar,
          amount: input.amount,
          billable: input.billable,
          markup: input.markup,
          invoiced: false,
          invoice_id: null,
          stock_item_id: input.stock_item_id ?? null,
        };
        set((s) => ({
          expenses: { ...s.expenses, [id]: expense },
          pendingSyncIds: offline ? [...s.pendingSyncIds, id] : s.pendingSyncIds,
        }));
        return expense;
      },

      updateExpense: (id, input) => set((s) => {
        const e = s.expenses[id];
        if (!e || e.invoiced) return s;
        return {
          expenses: {
            ...s.expenses,
            [id]: {
              ...e,
              description_ar: input.description_ar,
              amount: input.amount,
              billable: input.billable,
              markup: input.markup,
              milestone_id: input.milestone_id,
            },
          },
        };
      }),

      reconcilePendingSync: () => set((s) => (s.pendingSyncIds.length === 0 ? s : { pendingSyncIds: [] })),
    }),
    { name: "flexova.projects" }
  )
);
