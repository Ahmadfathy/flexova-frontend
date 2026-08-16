import Link from "next/link";
import { UserX, Info } from "lucide-react";
import type { AccountLayoutProps } from "@/lib/core/theme-contract";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import styles from "./AccountLayout.module.css";

const STORE_NAME = "متجر النيل";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  pending_payment: "بانتظار تأكيد الدفع",
};

/** spec §9 — optional account, guest needs none. "Login" is the same
 * phone-match `matchCrmCustomer` mock checkout already uses (spec §7) —
 * no separate auth system exists in this build, so this doesn't invent
 * one; see `AccountLayoutProps`. */
export function AccountLayout({ phone, matched, orders, address }: AccountLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />
      <div className={styles.body}>
        <h1 className={styles.title}>حسابي</h1>
        <p className={styles.optionalNote}>حساب اختياري — الشراء كضيف لا يحتاج تسجيل دخول</p>

        {matched !== true && (
          <form action="/account" method="get" className={styles.form}>
            <label className={styles.label} htmlFor="acc-phone">رقم الموبايل</label>
            <input
              id="acc-phone"
              name="phone"
              defaultValue={phone}
              placeholder="01xxxxxxxxx"
              className={styles.input}
              dir="ltr"
            />
            <button type="submit" className={styles.submitBtn}>دخول</button>
          </form>
        )}

        {matched === false && (
          <div className={styles.stateBox}>
            <UserX size={28} className={styles.stateIcon} />
            <p>لم نجد حساب بهذا الرقم</p>
            <Link href="/products" className={styles.browseLink}>متابعة التسوّق كضيف</Link>
          </div>
        )}

        {matched === true && (
          <div className={styles.result}>
            <p className={styles.demoNote}>
              <Info size={14} /> بيانات تجريبية للعرض فقط — لا يوجد نظام حسابات فعلي بعد
            </p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>طلباتي</h2>
              {orders.length === 0 ? (
                <p className={styles.hint}>لا يوجد طلبات سابقة</p>
              ) : (
                <div className={styles.orderList}>
                  {orders.map((o) => (
                    <Link key={o.code} href={`/track?code=${encodeURIComponent(o.code)}`} className={styles.orderRow}>
                      <span className={styles.orderCode}>{o.code}</span>
                      <span className={styles.orderStatus}>{STATUS_LABELS[o.status ?? ""] ?? o.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {address && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>العناوين المحفوظة</h2>
                <div className={styles.addressBox}>
                  <p>{address.name} — {address.phone}</p>
                  <p>{address.address}{address.zone ? ` — ${address.zone}` : ""}</p>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      <Footer storeName={STORE_NAME} />
    </div>
  );
}
