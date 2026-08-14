/**
 * No auth→provider mapping exists yet for this module (the auth store's
 * `user` is a back-office login, not a clinical provider record) — same
 * situation FE_16 solved with `CURRENT_EMPLOYEE_ID`. Reused everywhere this
 * module needs a "current provider" for scope narrowing (spec §11 — "provider
 * sees own patients/encounters unless view_all"): Today Board's provider
 * picker defaults/locks to this id whenever `healthcare.patients.view_all`
 * isn't granted.
 */
export const CURRENT_PROVIDER_ID = "prov_dr_sara";

/** Fallback actor for access-log entries with no clinically-meaningful
 * provider context (e.g. an administrative-only Patient 360 open, or a lab
 * technician entering a result — `tech_lab` in the fixture has no back-office
 * login either). */
export const CURRENT_STAFF_ACTOR = "staff";
