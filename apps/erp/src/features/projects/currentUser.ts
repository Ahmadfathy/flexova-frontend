/**
 * No auth/session → employee mapping exists yet for this module (the auth store's
 * `user` is a back-office login, not an HR employee record). The fixture itself
 * already assumes a "current actor" for approval/SoD demonstration purposes —
 * `te_9`'s `_flag: "sod_self_approved"` has `emp_manager` reviewing their own entry —
 * so we reuse that same employee as the mock "current user" everywhere this module
 * needs one (audit log actor, approval/SoD checks in later prompts).
 */
export const CURRENT_EMPLOYEE_ID = "emp_manager";
