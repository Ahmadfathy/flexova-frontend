# Flexova — FE_08 Users, Roles & Permissions (build-ready)

> **Phase 4 — Core module 8 (final).** The access-control layer governing every module; multi-tenant security from day one. Page by page, every field/state/interaction/permission/responsive/AR+EN, with fixtures.
> Version: 1.0 — June 2026
> **Source of truth (do not redefine):** `Flexova_SPEC_EN_08_Users_Roles_Permissions` + `Flexova_UIUX_08_Users_Roles_Permissions` · `Flexova_FE_00_Foundation` (Appearance preferences) · `Flexova_FE_01..07` (this module **consolidates the permission keys each declared**).
> **Governing principle — "ready roles, not a raw matrix":** a non-technical admin picks a role template (Owner / Branch Manager / Cashier / Accountant / Stock Keeper / Sales Rep) and assigns it; the granular matrix is hidden behind an advanced mode for power users.
> **Golden rules (carried):** (1) **Default-deny** — anything not explicitly granted is denied (enforced server-side). (2) Two scope dimensions: **branch + row** (own data). (3) Sensitive actions ⚠ require their elevated permission and write an **immutable audit entry**. (4) **Last-admin lock** — the last `admin.user.manage` holder can't be disabled/demoted. (5) Suspend, never delete (retain data/trail). (6) Strict multi-tenant isolation; the platform super-admin console is a **separate internal app**, out of this UI.

---

## 0) Module scope (recap)

**In v1:** users, roles (RBAC) + per-archetype templates, unified permission catalog, branch + row-level scoping, login/2FA/sessions, security policies, audit log, user preferences (theme/layout/lang).
**Out (later/separate):** platform super-admin console (tenant/plan mgmt — separate internal app), multi-step approval workflows, SSO, field-level permissions, temporary delegation.

Governs every core module (every action/screen gated by permission + scope); Reports row/branch scope; optional employee↔user link (HR); invites + reset/2FA via WhatsApp/email; tenant default theme + user override (dark/light = user priority, from FE_00 Appearance). Data via `lib/mock/client.ts` reading `permissions.fixtures.json`.

---

## 1) Routes & IA

Mounts under shell nav `nav.permissions`. Secondary **Tabs** below `PageHeader`.

```
/admin                           → redirect → /admin/users
/admin/users                     → Users list                 [§4]
/admin/users/new                 → Invite user                [§4]
/admin/users/:id                 → User card / edit           [§5]
/admin/roles                     → Roles list                 [§6]
/admin/roles/new                 → Role editor (advanced)     [§6]
/admin/roles/:id                 → Role editor                [§6]
/admin/security                  → Security policies          [§7]
/admin/audit                     → Audit log                  [§8]
/admin/branches                  → Branches & scope           [§9]
```

**Secondary tabs:** Users · Roles · Branches · Security · Audit log.
**Modals/drawers:** Invite user (modal, §4) · Terminate session (`AlertDialog`, §5) · Reset 2FA (`AlertDialog`) · Sensitive-action confirm (`AlertDialog`, module-wide §3) · Suspend user (`AlertDialog`, §5).
**i18n namespace:** `admin`. AR default, EN mirror.

---

## 2) Unified permission catalog (consolidates FE_01..07; ⚠ = sensitive, ⚠⚠ = elevated)

The single system-defined catalog every other module checks. Grouped by module.

| Module | Keys |
|---|---|
| **inventory** | `inventory.view` · `item.manage` · `stock.adjust`⚠ · `transfer` · `count` · `valuation.view` |
| **sales+eta** | `sales.view` · `invoice.create` · `invoice.submit` · `invoice.cancel`⚠ · `return`⚠ · `quote` · `discount.override`⚠ · `eta.send`/`eta.resend` · `eta.settings`⚠ |
| **purchasing** | `purchasing.view` · `po.create` · `invoice.create`/`approve` · `receipt.create` · `return`⚠ · `supplier.manage` · `payment.create` · `inbound.respond`⚠ |
| **finance** | `finance.view_simple` · `view_accounting` · `expense.create` · `receipt.create` · `payment.create` · `transfer` · `treasury.manage` · `journal.manual`⚠ · `coa.manage`⚠ · `reconcile` · `period.close`⚠ · `period.reopen`⚠⚠ · `reports.view` |
| **crm** | `crm.customer.view`/`create`/`edit` · `merge`⚠ · `credit.set` · `credit.override`⚠ · `followup.manage` · `loyalty.manage` · `communicate` · `import`/`export` |
| **hr** | `hr.employee.view`/`manage` · `attendance.manage` · `advance.request` · `advance.approve`⚠ · `commission.manage` · `payroll.run` · `payroll.approve`⚠ · `statutory.config`⚠⚠ · `payslip.view` · `export` |
| **reports** | `reports.view` · `view_financial`⚠ · `view_all_branches` · `build` · `save` · `schedule` · `export` · `dashboard.customize` · `eta.view` |
| **admin (this module)** | `admin.user.manage`⚠ · `role.manage`⚠ · `security.config`⚠⚠ · `audit.view` · `branch.manage` |

The Role editor (§6) renders this catalog grouped by module with high-level toggles that expand to the granular keys; ⚠/⚠⚠ are visually marked.

---

## 3) Permission enforcement model (how every module consumes this)

- **Check:** `can(permissionKey, scopeContext)` → boolean, O(1) from a cached role→permission map. UI hides or disables ungranted affordances; server re-checks (default-deny).
- **Scope:** every data query carries `{branches[], rowRule: all|branch|own}`; out-of-scope rows/branches are filtered at the query layer, not shown then blocked.
- **Sensitive (⚠):** requires the elevated key **and** an explicit confirm; on execution writes an **append-only audit entry**.
- **Blocked UX:** ungranted action → hidden where possible, else disabled with a colloquial message ("you need the X permission — ask your admin"), never a tech code.

> This is the contract FE_01..07 reference in their "Permissions" sections; this module is the authority.

---

## 4) Screen — Users (`/admin/users`, `/new`)

### 4.1 List
`PageHeader`: `+ invite user` (primary). Columns: name · role(s) · branch scope · last login · status pill (active/suspended). Filters: role, branch, status. 
### 4.2 Invite (modal)
name ✱ + phone/email ✱ → **pick role template** (the 6 templates §10, or a custom role) → branch scope (multi-select, if applicable) → **invite via WhatsApp/email** → user sets their own password on first login.
### 4.3 Five states
Loading (skeleton) · **empty:** "invite your team" + invite CTA · error · no-results · offline (banner; **permissions cached for offline POS**; changes apply on sync; first login needs connection).
### 4.4 Permissions
`admin.user.manage` (⚠) to view/invite/edit.
### 4.5 AR / EN
| key | AR | EN |
|---|---|---|
| admin.users.title | المستخدمون | Users |
| admin.users.invite | دعوة مستخدم | Invite user |
| admin.users.role | الدور | Role |
| admin.users.scope | النطاق | Scope |
| admin.users.last_login | آخر دخول | Last login |
| admin.users.empty | ابدأ بدعوة فريقك | Invite your team |
| admin.users.invite_sent | أُرسلت الدعوة عبر {{channel}} | Invitation sent via {{channel}} |

### 4.6 Acceptance
Inviting picks a template + scope and sends an invite; user sets password on first login; out-of-scope branches not selectable beyond admin's own scope.

---

## 5) Screen — User card / edit (`/admin/users/:id`)

Header: name, login, status. Sections: **roles** (one or more) · **scope** (branches[] + row rule all/branch/own) · **status** (active/suspended) · **active sessions** (device/time, **terminate remotely**) · **reset 2FA**.
**Offboarding:** suspend → **terminates all sessions + blocks login**; data/trail retained (no delete). **Last-admin lock:** disabling/demoting the last `admin.user.manage` holder is blocked with a safety message.
**States:** loading · error · offline · session-terminated (the affected user gets immediate safe logout + clear message). **Permissions:** `admin.user.manage` (⚠).
**AR/EN:** `admin.user.sessions`="الجلسات النشطة"/"Active sessions", `admin.user.terminate`="إنهاء الجلسة"/"Terminate session", `admin.user.suspend`="إيقاف المستخدم"/"Suspend user", `admin.user.reset_2fa`="إعادة تعيين 2FA"/"Reset 2FA", `admin.user.last_admin`="لا يمكن تعطيل آخر مدير للنظام"/"Can't disable the last system admin".
**Acceptance:** suspending terminates sessions + blocks login while retaining data/trail; last admin can't be disabled/demoted; sessions terminable remotely.

---

## 6) Screen — Roles + Role editor (`/admin/roles`, `/new`, `/:id`)

### 6.1 Roles list
Templates + custom roles; **user-count per role**; clone / edit. The 6 seeded templates (§10) are clonable, not destructively editable in place (clone to customize).
### 6.2 Role editor (matrix — advanced; most tenants never open it)
Permission matrix **grouped by module**, each group with a **high-level toggle** ("full Sales access") that **expands to the granular keys** (§2). ⚠/⚠⚠ visually marked (e.g. danger chip). Below the matrix: **branch scope** (which branches) + **row rule** (all / branch / own). Save.
### 6.3 States
All 5. **Permissions:** `admin.role.manage` (⚠).
### 6.4 AR / EN
| key | AR | EN |
|---|---|---|
| admin.roles.title | الأدوار | Roles |
| admin.roles.user_count | {{n}} مستخدم | {{n}} users |
| admin.roles.clone | نسخ | Clone |
| admin.role.full_access | وصول كامل لـ {{module}} | Full {{module}} access |
| admin.role.sensitive | إجراء حسّاس | Sensitive |
| admin.role.branch_scope | النطاق الفرعي | Branch scope |
| admin.role.row_rule | قاعدة الرؤية | Row rule |
| admin.role.row_all | الكل | All |
| admin.role.row_branch | الفرع | Branch |
| admin.role.row_own | بياناته فقط | Own only |

### 6.5 Acceptance
High-level toggle expands to granular; ⚠ marked; scope (branch + row) set per role; templates clonable.

---

## 7) Screen — Security policies (`/admin/security`)

Password policy (min length/complexity), **enable/enforce 2FA** (tenant-wide), session timeout, trusted devices. Enforcing 2FA requires users to set it up on next login.
**States:** all 5. **Permissions:** `admin.security.config` (⚠⚠).
**AR/EN:** `admin.security.title`="الأمان"/"Security", `admin.security.password`="سياسة كلمة السر"/"Password policy", `admin.security.enforce_2fa`="فرض المصادقة الثنائية"/"Enforce 2FA", `admin.security.timeout`="مهلة الجلسة"/"Session timeout".
**Acceptance:** 2FA can be enabled per user and enforced per tenant; session timeout applies.

---

## 8) Screen — Audit log (`/admin/audit`)

Immutable, **append-only** timeline of sensitive actions: who · what · when · branch · target. Filters (user/action/period/branch); export. No edit/delete affordances anywhere.
**States:** loading · empty ("no sensitive actions yet") · error · no-results. **Permissions:** `admin.audit.view`.
**AR/EN:** `admin.audit.title`="سجلّ التدقيق"/"Audit log", `admin.audit.who`="مَن"/"Who", `admin.audit.what`="الإجراء"/"Action", `admin.audit.when`="متى"/"When", `admin.audit.immutable`="سجلّ غير قابل للتعديل"/"Immutable log".
**Acceptance:** sensitive actions appear; log is immutable; filter/export work.

---

## 9) Screen — Branches & scope (`/admin/branches`)

Manage branches (name, code, address) + link user access. **This feeds the scope dimension consumed by every module and every report.**
**States:** all 5. **Permissions:** `admin.branch.manage`.
**AR/EN:** `admin.branches.title`="الفروع والنطاق"/"Branches & scope", `admin.branches.access`="وصول المستخدمين"/"User access".
**Acceptance:** branch changes propagate to scope across all modules and reports.

---

## 10) Default role templates (seeded per archetype, clonable)

| Role | Essence | Typical scope |
|---|---|---|
| **Owner** | everything incl. admin + full finance | all branches |
| **Branch Manager** | sales/inventory/reports of own branch, no user admin | own branch |
| **Cashier** | sale + receipt + POS + Z-report | own shift (row) |
| **Accountant** | full accounting + financial reports, no operational delete | assigned |
| **Stock Keeper** | inventory + count + transfer | own branch |
| **Sales Rep** | own customers/sales/collection | own (row) |

All clonable/editable to create custom roles.

---

## 11) Critical states, login/2FA, RTL, performance

- **Permission-blocked:** ungranted action hidden or disabled with colloquial message (no tech codes).
- **Last admin:** block disabling/demoting the last `admin.user.manage` holder.
- **Offline:** permissions cached locally for offline (POS); changes apply on sync; **first login needs connection**.
- **Session expired/terminated:** immediate safe logout + clear message.
- **Login + 2FA flow:** phone/email + password → (if enabled) second code → session. Reset via phone/email code.
- Western digits; phone/email LTR within RTL; everything RTL via logical properties.
- **Performance:** permission checks O(1) from cached role→permission map; scope filters pushed to the query layer (row/branch); audit writes async append-only.

## 12) Coverage matrix

| entity | screens | 5 states | responsive | permissions | AR/EN |
|---|---|---|---|---|---|
| User | list, invite, card/edit | ✓ | ✓ | admin.user.manage | ✓ |
| Role | list, editor (matrix) | ✓ | ✓ | admin.role.manage | ✓ |
| Permission | catalog (in editor) | n/a | ✓ | role.manage | ✓ |
| Scope (branch+row) | role editor, branches | ✓ | ✓ | branch.manage | ✓ |
| Session | user card | ✓ | ✓ | user.manage | ✓ |
| Security policy | security | ✓ | ✓ | security.config | ✓ |
| Audit log | audit | ✓ | ✓ | audit.view | ✓ |
| Branch | branches & scope | ✓ | ✓ | branch.manage | ✓ |

## 13) Module acceptance criteria
1. A permission not granted is denied (default-deny), enforced server-side.
2. Branch/row scope correctly filters data in every module and report.
3. Sensitive actions require their elevated permission and write an immutable audit entry.
4. The last admin cannot be disabled or demoted.
5. Suspending a user terminates sessions and blocks login while retaining their data/trail.
6. 2FA can be enabled per user and enforced per tenant.
7. Ready templates assignable without touching the matrix; everything RTL via i18n keys with all 5 states.

**Fixtures:** `Flexova_FE_08_Users_Roles_Permissions.fixtures.json` (Egyptian context — users mapped to the 6 templates with branch/row scope, the unified catalog, role templates with permission sets, branches, active sessions, immutable audit entries, security policy, last-admin lock case).

---

## 14) Layer-2 close — Core FE specs complete

With FE_08, the **8 core modules** are fully specified for build:
**FE_00 Foundation · FE_01 Inventory · FE_02 Sales+ETA · FE_03 Purchasing · FE_04 Accounting · FE_05 CRM · FE_06 HR · FE_07 Reports · FE_08 Permissions** ✅

What builds on this:
- **Build the Core:** Claude Code implements React (Vite+TS+Tailwind+shadcn+i18next+Zustand+mock layer) from FE_00 + these module specs and fixtures.
- **Sectors (Phase 5):** start with **Retail/POS** on top of this core, same methodology (POS grid, sold-by-weight, variants…), reusing the e-receipt/sign/sync logic defined in FE_02 and the offline patterns throughout.

> Outputs live in `/mnt/user-data/outputs/` — upload them to the Project so they're a stable reference for the build chats.

*End of FE_08 Users, Roles & Permissions — version 1.0*
*End of Layer 2 — Core frontend specs.*
