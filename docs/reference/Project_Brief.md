# Flexova — Project Brief

> Reference document uploaded inside the Flexova project as the starting point for all upcoming conversations and phases.
> Version: 1.0 — May 2026

---

## 1) Overview

**Flexova** is an ERP aimed at the Egyptian market, built on **one flexible base (Flexible Core)** that serves every sector, with modules that activate according to each business's nature.

- **Target segment:** from simple businesses up to upper-mid-size.
- **Core principle:** a shared Core + specialized modules per operating pattern.
- **Integrations:** POS, CRM, and E-commerce — activated as the customer needs.
- **Technology:** fully Web-based at first, with a later plan for a Mobile App and a Desktop App.
- **Egyptian compliance:** e-invoice and e-receipt (ETA) support as a first-class feature.

---

## 2) Vision & architectural philosophy

The core idea: **we don't build a system per sector; we build one Core + operating patterns.**

Every sector in the market falls under one of **13 operational archetypes**. Sectors within the same archetype share the same modules, so building an archetype once serves dozens of businesses.

```
                ┌─────────────────────────┐
                │      Shared Core         │
                │ (inventory/sales/        │
                │  purchasing/accounting/  │
                │  CRM/HR/reports)         │
                └────────────┬────────────┘
                             │
   ┌──────────┬──────────┬───┴────┬──────────┬──────────┐
 Retail     F&B      Services  Healthcare  Manufact.   ...
   │          │          │          │          │
(businesses)(businesses)(businesses)(businesses)(businesses)
```

---

## 3) The shared Core (Core Modules)

Used across all sectors without exception — this is the flexible Base:

| Module | Function |
|---|---|
| Inventory & Items | items, units of measure, barcode, balances, multi-warehouse and multi-branch |
| Sales & Invoicing | sales invoices, returns, quotations |
| Purchasing & Suppliers | purchase orders, purchase invoices, supplier balances |
| Customers (CRM) | customer data, balances, transaction history, follow-up |
| Accounting & Finance | treasury, banks, expenses, journal entries, trial balance |
| HR & Payroll | employees, attendance, salaries, commissions, advances |
| Reports & Dashboards | customizable dashboards and reports |
| Users & Permissions | roles, permissions, multi-branch and multi-user |
| **E-invoice & E-receipt (ETA)** | integration with the Egyptian Tax Authority system |

**Optional modules attached to the Core:**
- **POS** — for direct-sale businesses.
- **E-commerce / Online Store** — an online store linked to inventory.
- **Payment gateways** — integration with electronic payment methods.

---

## 4) The core operating archetypes (13 patterns)

### Pattern 1 — Retail via POS
**Businesses:** grocery / supermarket / mini-market, clothing stores, perfumes/accessories/cosmetics, bookstores (stationery & school supplies + toys + gifts), mobiles & electronics, toys & gifts, household goods.
**Distinctive modules:**
- **Butchery/fresh:** sold-by-weight (scale), items cut from one another.
- **Pharmacies:** expiry dates, batches, shortage alerts, restricted items.
- **Clothing:** sizes and colors (variants / matrix) — one model with several SKUs.

### Pattern 2 — Restaurants, cafés & hospitality (F&B)
**Businesses:** restaurants, cafés, bakeries & confectioneries, cloud kitchens, catering.
**Distinctive modules:** recipe/ingredients (Recipe/BOM deducting from raw materials), table management, kitchen display (KDS), delivery, integration with ordering apps.

### Pattern 3 — Appointment-based services
**Businesses:** men's and women's salons, beauty & spa centers, gyms & fitness.
**Distinctive modules:** appointment calendar, service provider, staff commissions, packages & subscriptions, a service + product mix on one invoice.

### Pattern 4 — Time/session-based services
**Businesses:** PlayStation/billiards/ping-pong halls, kids' areas, game halls, co-working spaces.
**Distinctive modules:** time-based pricing (start/stop counter), device/table management, cafeteria on the same invoice.

### Pattern 5 — Healthcare
**Businesses:** clinics, small and mid-size medical centers, dental, labs & imaging centers, physiotherapy, veterinary.
**Distinctive modules:** patient file (simplified EMR), appointments, prescriptions & tests, insurance, doctor as a commissioned service provider.

### Pattern 6 — Education
**Businesses:** learning centers, language institutes, nurseries & kindergartens, training centers, driving schools.
**Distinctive modules:** students, groups/classes, class schedule, attendance, installments & fees, commissioned teachers.

### Pattern 7 — Project/case-based professional services
**Businesses:** law firms, accounting & audit, engineering & consulting offices, marketing agencies, real-estate offices.
**Distinctive modules:** case/project as a unit, time tracking, documents, milestone billing, appointments.

### Pattern 8 — Repair / service
**Businesses:** mobile & electronics repair, auto workshops & mechanics, home-appliance & AC repair, computer repair, general maintenance.
**Distinctive modules:** the work order as the system's heart, device intake & condition, parts used, warranty, repair-status tracking.

### Pattern 9 — Manufacturing & production
**Businesses:** small factories, production workshops, food manufacturing, carpentry & furniture, garment manufacturing, printing presses.
**Distinctive modules:** bill of materials (BOM), production/work orders, manufacturing stages, finished-product costing.

### Pattern 10 — Shipping & logistics
**Businesses:** shipping companies, last-mile delivery, warehousing & fulfillment, transport.
**Distinctive modules:** the shipment as a unit, status tracking, couriers, cash on delivery (COD) and settlement with couriers and merchants.

### Pattern 11 — Contracting & construction
**Businesses:** contracting companies, finishing & décor, engineering projects.
**Distinctive modules:** multi-phase project, progress invoices (extracts), subcontractors, actual vs estimated cost.

### Pattern 12 — E-commerce & digital
**Businesses:** online stores, **affiliate (commission marketing)**, dropshipping, social selling.
**Distinctive modules:** linking the store to inventory, payment gateways, a commission/affiliate/links system (for affiliate), online order management.

### Pattern 13 — Wholesale & distribution
**Businesses:** wholesalers, distributors and van sales, import/export.
**Distinctive modules:** tiered pricing by quantity and customer, sales routes for reps, customer credit limits.

---

## 5) Additional sectors (extended)

Sectors needed in the Egyptian market, each classified under its operating archetype to stay consistent with the architecture:

| Sector | Closest archetype | Distinctive need |
|---|---|---|
| Auto showrooms, spare parts & tires | Retail + Repair | linking the part to model/year, chassis number, service + part sale |
| Jewelry & gold stores | Retail (special) | pricing by daily gold price + weight + workmanship, gold karat |
| Building materials, plumbing & electrical | Retail + Wholesale | bulk sales, heavy credit, delivery, variable prices |
| Property & rental management | Project / special | lease contracts, recurring collection, owners' associations & compounds |
| Hotels, furnished apartments & lodges | Time/Booking | per-night bookings, room availability, extra services, check-in/out |
| Laundry & ironing | Service / Order | laundry order, intake/delivery, pricing per piece or per kilo, tracking |
| Poultry, farms & livestock | Manufacturing/special | production cycles, feed, mortality, cycle cost |
| Agricultural supplies | Retail + Wholesale | expiry dates, bulk sales, seasons |
| Fuel & gas stations | Retail (special) | sale by liter, shifts, pump meters, shift settlement |
| Travel & booking agencies | Service / Booking | bookings, packages, commissions, service suppliers (flights/hotels) |
| Sports clubs & subscriptions | Subscription | renewable memberships, auto-renewal, access validity |
| Florists & nurseries | Retail + Order | perishable products, orders with delivery date, delivery |
| Import & customs-clearance offices | Project / special | shipments, customs fees, documents, multi-currency |
| Cleaning & home-service companies | On-demand Service | service request, labor scheduling, recurring contracts |
| Gas cylinder packing & distribution | Logistics + Retail | cylinders (empty/full), deposits, reps |
| NGOs & non-profits | Special | donations, campaigns, expenses, donor reports |
| Publishing houses & printing presses | Manufacturing | print orders, materials (paper/ink), cost, distribution |

> Note: very special-natured sectors (gold, fuel stations, hotels, real estate) may warrant dedicated modules built on top of the Core; their priorities are studied later.

---

## 6) Integrations

- **POS:** an integrated point of sale for direct-sale businesses (supports online/offline operation).
- **CRM:** customer relationship management, follow-ups, loyalty & points.
- **E-commerce:** an online store linked to inventory and prices in real time.
- **E-invoice & e-receipt (ETA):** sending invoices and receipts to the Egyptian Tax Authority system per official requirements.
- **Payment gateways & delivery apps:** per each sector's need.

---

## 7) Technology & direction

- **Phase one:** fully Web-based (runs from any browser).
- **Advanced phase:** Mobile App (for the customer and the rep/cashier) and a Desktop App.
- **Proposed architecture to study:** multi-tenant (serving multiple customers/companies on the same platform) with per-customer data isolation.
- **Scalability:** modules turn on/off per customer according to plan and business.

---

## 8) Preliminary roadmap (for discussion)

1. **Phase 1:** build the shared Core + POS + e-invoice.
2. **Phase 2:** activate the first 3–4 market-priority operating patterns (e.g. Retail, F&B, Services).
3. **Phase 3:** add CRM and E-commerce.
4. **Phase 4:** the remaining operating patterns in sequence.
5. **Phase 5:** Mobile App and Desktop App.

> Final priority order is set based on market demand size and ease of execution.

---

## 9) Open questions for upcoming conversations

- Sector priority order for launch.
- Detailing the database and the Core's data model.
- Pricing and plans model (per customer / per module).
- Multi-tenant architecture and its technical details.
- Precise ETA integration requirements (the system's current version).

---

*End of document — version 1.0*
