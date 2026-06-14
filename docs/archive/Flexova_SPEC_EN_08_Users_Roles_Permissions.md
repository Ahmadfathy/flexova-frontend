# Flexova — Users, Roles & Permissions Spec (EN, build-ready)

> Layer 2, Core module 8 (final). Access-control layer governing all modules; multi-tenant security from day one.
> Depends on: Design System + all core modules (consolidates their permission keys). v1.

## 1. Scope
**In:** users, roles (RBAC) + per-archetype templates, unified permission catalog, branch + row-level scoping, login/2FA/sessions, security policies, audit log, user preferences (theme/layout/lang).
**Out (later/separate):** platform super-admin console (tenant/plan mgmt) — separate internal app; multi-step approval workflows; SSO; field-level permissions; temporary delegation.
**Principles:** ready role templates (not raw matrix); **least privilege / default-deny**; strict multi-tenant isolation; tamper-proof audit log.

## 2. Entities (✱ required)

### 2.1 User
| Field | Type | Req | Notes |
|---|---|---|---|
| login | string | ✱ | phone or email |
| name | string | ✱ | |
| roles[] | refs | ✱ | one or more |
| scope | object | ✱ | branches[] + row rule `all/branch/own` |
| status | enum | ✱ | active/suspended |
| auth | object | | password + optional 2FA |
| preferences | object | | theme/layout/lang (tenant default + user override; dark/light = user priority) |

### 2.2 Other entities
- **Role** — permission set + scope; template (cloneable) or custom.
- **Permission** — atomic action key (system-defined catalog, §3).
- **Scope** — allowed branches + row rule (all / branch / own).
- **Session** — active login (device/time), remotely terminable.
- **Security Policy** — password rules, enforce-2FA, session timeout.
- **Audit Log** — who/what/when for sensitive actions; **append-only, not deletable**.

## 3. Unified permission catalog (consolidates modules 1–7; ⚠ = sensitive)
- **inventory:** view · item.manage · stock.adjust⚠ · transfer · count · valuation.view
- **sales+eta:** view · invoice.create · invoice.edit · return⚠ · quote · discount.override⚠ · eta.send
- **purchasing:** view · po.create · bill.create · return⚠ · supplier.manage
- **finance:** view_simple · view_accounting · expense.create · receipt.create · payment.create · transfer · journal.manual⚠ · coa.manage⚠ · reconcile · period.close⚠ · period.reopen⚠⚠
- **crm:** customer.view · create · edit · merge⚠ · credit.set · credit.override⚠ · followup.manage · loyalty.manage · communicate · import/export
- **hr:** employee.manage · attendance.manage · advance.approve⚠ · commission.manage · payroll.run · payroll.approve⚠ · statutory.config⚠⚠ · payslip.view
- **reports:** view · view_financial⚠ · view_all_branches · build · schedule · export · dashboard.customize · eta.view
- **admin:** user.manage⚠ · role.manage⚠ · security.config⚠⚠ · audit.view · branch.manage

## 4. Default role templates (seeded by archetype)
Owner (all incl. admin/finance — all branches) · Branch Manager (sales/inventory/reports of own branch, no user admin — own branch) · Cashier (sale+receipt+POS+Z-report — own shift, row) · Accountant (full accounting + financial reports, no operational delete — assigned) · Stock Keeper (inventory/count/transfer — own branch) · Sales Rep (own customers/sales/collection — own, row). All cloneable/editable.

## 5. Flows
- **Add/invite user:** name + phone/email → **pick role template** → branch scope → invite (WhatsApp/email) → user sets password.
- **Custom role (advanced):** clone template → matrix (grouped by module; high-level toggles expand to granular) → set branch/row scope → save.
- **Login + 2FA:** login + password → (if on) second code → session. Reset via phone/email code.
- **Offboarding:** suspend → terminate all sessions → block login; data/trail retained (no delete).
- **Audit review:** filter (user/action/period/branch) → who/what/when → export.
- **Sensitive action:** without permission → blocked w/ clear message; with permission → explicit confirm + audit entry.

## 6. Screens
- **Users:** list (name/role/branch/last-login/status) + invite + filters; empty=“invite your team”.
- **User card/edit:** roles + scope + status + active sessions (remote terminate) + reset 2FA.
- **Roles:** templates + custom, user-count per role, clone/edit.
- **Role editor (matrix):** grouped by module, high-level toggle (“full Sales access”) expands to granular; ⚠ visually marked; branch/row scope below. *Most tenants never open this.*
- **Security:** password policy, enforce/enable 2FA, session timeout, trusted devices.
- **Audit log:** timeline of sensitive actions, filter/export, immutable.
- **Branches & scope:** manage branches + link user access (feeds scope across all modules/reports).

## 7. States
- **Permission-blocked:** unauthorized action hidden or disabled w/ colloquial message (no tech codes).
- **Last admin:** block disabling/demoting the last `admin.user.manage` holder (safety lock).
- **Offline:** permissions cached locally for offline (POS); changes apply on sync; first login needs connection.
- **Session expired/terminated:** immediate safe logout + clear message.
- All 5 data states per Design System §8.

## 8. Integrations
All core modules (every action/screen gated by permission + scope). Reports (row/branch scope governs visibility). HR (optional employee↔user link). WhatsApp/email (invites, reset/2FA codes). Settings/Theming (tenant default theme + user override; dark/light = user priority).

## 9. Performance
Permission checks O(1) from cached role→permission map; scope filters pushed to query layer (row/branch); audit writes async append-only.

## 10. Decisions (v1, locked)
- RBAC + per-archetype templates (matrix for power users only).
- Two scope dimensions: **branch + row (own data)**.
- **Default-deny**; sensitive actions ⚠ isolated.
- **2FA available**, tenant-enforceable.
- **Audit log** for sensitive actions from day one (immutable).
- Strict multi-tenant isolation; tenant admin scoped to own tenant; platform console separate.
- Last-admin lock; suspend not delete.
- Unified permission catalog (§3) consolidates modules 1–7.
- Approval workflows / SSO / field-level / delegation = later.

## 11. Acceptance criteria
- A permission not granted is denied (default-deny), enforced server-side.
- Branch/row scope correctly filters data in every module and report.
- Sensitive actions require their elevated permission and write an immutable audit entry.
- The last admin cannot be disabled or demoted.
- Suspending a user terminates sessions and blocks login while retaining their data/trail.
- 2FA can be enabled per user and enforced per tenant.
