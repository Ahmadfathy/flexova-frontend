export type SearchResultType = "invoice" | "customer" | "item" | "supplier" | "employee";

export interface SearchItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchGroup {
  type: SearchResultType;
  /** i18n key in shell namespace, e.g. "search.groups.invoices" */
  labelKey: string;
  items: SearchItem[];
}

export interface SearchResponse {
  groups: SearchGroup[];
}

// ─── Dummy data ────────────────────────────────────────────────────────────────

const ALL_ITEMS: SearchItem[] = [
  // Invoices
  { id: "inv-001", type: "invoice",  title: "فاتورة - محمد أحمد عبد الله",  subtitle: "INV-2024-0001", href: "/sales/invoices" },
  { id: "inv-002", type: "invoice",  title: "فاتورة - شركة النيل للتجارة",   subtitle: "INV-2024-0002", href: "/sales/invoices" },
  { id: "inv-003", type: "invoice",  title: "فاتورة - كريم خالد",             subtitle: "INV-2024-0003", href: "/sales/invoices" },
  { id: "inv-004", type: "invoice",  title: "Invoice - Cairo Tech LLC",       subtitle: "INV-2024-0004", href: "/sales/invoices" },
  // Customers
  { id: "cus-001", type: "customer", title: "محمد أحمد عبد الله",             subtitle: "CUS-0001", href: "/crm/customers" },
  { id: "cus-002", type: "customer", title: "شركة النيل للتجارة",              subtitle: "CUS-0002", href: "/crm/customers" },
  { id: "cus-003", type: "customer", title: "كريم خالد السيد",                subtitle: "CUS-0003", href: "/crm/customers" },
  { id: "cus-004", type: "customer", title: "Cairo Tech LLC",                  subtitle: "CUS-0004", href: "/crm/customers" },
  // Items
  { id: "itm-001", type: "item",     title: "لاب توب Dell XPS 15",            subtitle: "SKU-00042", href: "/inventory/items" },
  { id: "itm-002", type: "item",     title: "شاشة Samsung 27\"",              subtitle: "SKU-00043", href: "/inventory/items" },
  { id: "itm-003", type: "item",     title: "طابعة HP LaserJet M110w",        subtitle: "SKU-00044", href: "/inventory/items" },
  { id: "itm-004", type: "item",     title: "كيبورد Logitech MX Keys",        subtitle: "SKU-00045", href: "/inventory/items" },
  // Suppliers
  { id: "sup-001", type: "supplier", title: "شركة التقنية المتطورة",          subtitle: "SUP-0001", href: "/purchasing/suppliers" },
  { id: "sup-002", type: "supplier", title: "مورد الإلكترونيات العربي",       subtitle: "SUP-0002", href: "/purchasing/suppliers" },
  { id: "sup-003", type: "supplier", title: "Delta Electronics Co.",           subtitle: "SUP-0003", href: "/purchasing/suppliers" },
  // Employees
  { id: "emp-001", type: "employee", title: "أحمد فتحي",                      subtitle: "EMP-0012", href: "/hr/employees" },
  { id: "emp-002", type: "employee", title: "سارة محمد علي",                  subtitle: "EMP-0013", href: "/hr/employees" },
  { id: "emp-003", type: "employee", title: "خالد عبد الرحمن",                subtitle: "EMP-0014", href: "/hr/employees" },
];

const GROUP_ORDER: { type: SearchResultType; labelKey: string }[] = [
  { type: "invoice",  labelKey: "search.groups.invoices"  },
  { type: "customer", labelKey: "search.groups.customers" },
  { type: "item",     labelKey: "search.groups.items"     },
  { type: "supplier", labelKey: "search.groups.suppliers" },
  { type: "employee", labelKey: "search.groups.employees" },
];

const MOCK_LATENCY = 200;

// ─── Public API — same signature as future global-search endpoint ──────────────

export async function mockSearchGlobal(query: string): Promise<SearchResponse> {
  await new Promise<void>((r) => setTimeout(r, MOCK_LATENCY));
  const q = query.trim().toLowerCase();
  if (!q) return { groups: [] };

  const groups: SearchGroup[] = [];
  for (const { type, labelKey } of GROUP_ORDER) {
    const items = ALL_ITEMS.filter(
      (it) =>
        it.type === type &&
        (it.title.toLowerCase().includes(q) || it.subtitle.toLowerCase().includes(q)),
    );
    if (items.length) groups.push({ type, labelKey, items });
  }
  return { groups };
}

// ─── Local search history ──────────────────────────────────────────────────────

const HISTORY_KEY = "flexova.search.history";
const MAX_HISTORY = 5;

export function getSearchHistory(): SearchItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as SearchItem[];
  } catch {
    return [];
  }
}

export function pushSearchHistory(item: SearchItem): void {
  const prev = getSearchHistory().filter((h) => h.id !== item.id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...prev].slice(0, MAX_HISTORY)));
}
