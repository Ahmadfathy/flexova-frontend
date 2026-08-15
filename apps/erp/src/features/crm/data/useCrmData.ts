import { useState, useEffect, useCallback } from "react";
import { mockFetch, loadFixture } from "@/lib/mock/client";

// ── Types ─────────────────────────────────────────────────────────

export interface CustomerAddress {
  gov:    string;
  area:   string;
  street: string;
}

export interface CustomerContact {
  name:  string;
  role:  string;
  phone: string;
}

export interface CustomerAging {
  current:  number;
  d1_30:    number;
  d31_60:   number;
  d60_plus: number;
}

export interface CrmCustomer {
  id:                 string;
  type:               "company" | "individual";
  name_ar:            string;
  name_en:            string;
  phone:              string | null;
  trn:                string | null;
  national_id:        string | null;
  address:            CustomerAddress | null;
  price_list_id:      string;
  credit_limit:       number;
  segments:           string[];
  status:             "active" | "inactive";
  ar_balance:         number;
  aging:              CustomerAging | null;
  oldest_overdue_days: number;
  contacts:           CustomerContact[];
  last_activity:      string | null;
  is_walkin?:         boolean;
  _flag?:             string;
}

export interface Segment {
  id:      string;
  name_ar: string;
  name_en: string;
  count:   number;
}

export interface FollowUp {
  id:          string;
  customer_id: string;
  note:        string;
  due:         string;
  owner:       string;
  status:      "open" | "done";
  group:       "due_today" | "upcoming" | "overdue";
}

export interface Communication {
  id:          string;
  customer_id: string;
  channel:     "whatsapp" | "call" | "email";
  template:    string | null;
  date:        string;
  summary_ar:  string;
  auto:        boolean;
}

export interface WhatsAppTemplate {
  id:      string;
  name_ar: string;
  name_en: string;
  body_ar: string;
}

export interface CrmData {
  customers:          CrmCustomer[];
  segments:           Segment[];
  followUps:          FollowUp[];
  communications:     Communication[];
  whatsappTemplates:  WhatsAppTemplate[];
}

// ── Hook ──────────────────────────────────────────────────────────

export function useCrmData() {
  const [data, setData]           = useState<CrmData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setIsOffline(false);
    try {
      const result = await mockFetch(
        () => loadFixture<Record<string, unknown>>("crm"),
        null,
      );

      if (!result) {
        setData({ customers: [], segments: [], followUps: [], communications: [], whatsappTemplates: [] });
        return;
      }

      const r = result as any;
      setData({
        customers:         r.customers          ?? [],
        segments:          r.segments           ?? [],
        followUps:         r.follow_ups         ?? [],
        communications:    r.communications     ?? [],
        whatsappTemplates: r.whatsapp_templates ?? [],
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "mock_offline") setIsOffline(true);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, isOffline, reload: load };
}
