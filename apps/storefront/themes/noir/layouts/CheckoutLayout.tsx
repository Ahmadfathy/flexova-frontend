"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CheckoutLayoutProps } from "@/lib/core/theme-contract";
import { useCheckout, type UseCheckoutReturn } from "@/lib/core/useCheckout";
import { formatCountdown } from "@/lib/core/checkout";
import type { ProductStatic, PaymentMethod } from "@/lib/core/types";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { OfflineBanner } from "../components/OfflineBanner";
import styles from "./CheckoutLayout.module.css";

const STORE_NAME = "متجر النيل";

const STEPS: { id: "delivery" | "shipping" | "payment" | "review"; label: string }[] = [
  { id: "delivery", label: "التوصيل" },
  { id: "shipping", label: "الشحن" },
  { id: "payment", label: "الدفع" },
  { id: "review", label: "المراجعة" },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; note?: string }[] = [
  { id: "paymob", label: "بطاقة / محفظة إلكترونية (Paymob)" },
  { id: "fawry", label: "فوري" },
  { id: "cod", label: "الدفع عند الاستلام", note: "بدون رسوم إضافية" },
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = { paymob: "بطاقة/محفظة (Paymob)", fawry: "فوري", cod: "الدفع عند الاستلام" };

const STATUS_LABELS: Record<string, string> = {
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  pending_payment: "بانتظار تأكيد الدفع",
};

/** noir's checkout — same `useCheckout` Shared-Core state as aurora's, a
 * structurally different presentation: numbered vertical step list (not a
 * horizontal pill row), flat underline fields (not boxed inputs), no card
 * borders — mirrors the plain-list/no-grid divergence CartLayout already
 * established between the two themes. */
export function CheckoutLayout({ catalog, zones }: CheckoutLayoutProps) {
  const c = useCheckout(zones);
  const productById = useMemo(() => Object.fromEntries(catalog.map((p) => [p.id, p])), [catalog]);

  if (c.cartHydrated && c.cartItems.length === 0 && c.step !== "confirmed") {
    return (
      <div className={styles.page}>
        <Header storeName={STORE_NAME} />
        <div className={styles.body}>
          <div className={styles.empty}>
            <p>سلتك فاضية</p>
            <Link href="/products" className={styles.browseLink}>تصفّح المنتجات</Link>
          </div>
        </div>
        <Footer storeName={STORE_NAME} />
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === c.step);

  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />
      <div className={styles.body}>
        <p className={styles.eyebrow}>إتمام الشراء</p>

        {c.isOffline && <OfflineBanner />}

        {c.step !== "confirmed" && (
          <>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s.id} className={i === stepIndex ? styles.stepActive : i < stepIndex ? styles.stepDone : styles.step}>
                  <button type="button" onClick={() => i < stepIndex && c.setStep(s.id)} disabled={i > stepIndex}>
                    <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ol>

            {!c.isOffline && <ReservationBanner c={c} />}

            {c.adjustedNotice && (
              <p className={styles.adjustedNotice}>تم تعديل كمية بعض المنتجات حسب المتاح حاليًا</p>
            )}
          </>
        )}

        {c.step === "delivery" && <DeliveryStep c={c} />}
        {c.step === "shipping" && <ShippingStep c={c} />}
        {c.step === "payment" && <PaymentStep c={c} />}
        {c.step === "review" && <ReviewStep c={c} productById={productById} />}
        {c.step === "confirmed" && <ConfirmedStep c={c} />}
      </div>
      <Footer storeName={STORE_NAME} />
    </div>
  );
}

function ReservationBanner({ c }: { c: UseCheckoutReturn }) {
  if (c.reservationLoading) {
    return <p className={styles.reservationBanner}>جارٍ حجز المنتجات لك...</p>;
  }
  if (!c.reservation) return null;
  if (c.reservation.status === "expired") {
    return (
      <p className={`${styles.reservationBanner} ${styles.reservationExpired}`}>
        انتهى وقت الحجز
        <button type="button" className={styles.reserveAgainBtn} onClick={c.reReserve}>إعادة الحجز</button>
      </p>
    );
  }
  const low = c.secondsLeft <= 60;
  return (
    <p className={`${styles.reservationBanner} ${low ? styles.reservationWarning : ""}`}>
      محجوز لك — {formatCountdown(c.secondsLeft)}
    </p>
  );
}

function DeliveryStep({ c }: { c: UseCheckoutReturn }) {
  return (
    <div className={styles.panel}>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="co-phone">رقم الموبايل</label>
        <input
          id="co-phone"
          className={styles.input}
          value={c.delivery.phone}
          onChange={(e) => c.setDelivery({ ...c.delivery, phone: e.target.value })}
          placeholder="01xxxxxxxxx"
          dir="ltr"
        />
        {c.deliveryErrors.phone && <p className={styles.errorText}>{c.deliveryErrors.phone}</p>}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="co-name">الاسم</label>
        <input
          id="co-name"
          className={styles.input}
          value={c.delivery.name}
          onChange={(e) => c.setDelivery({ ...c.delivery, name: e.target.value })}
        />
        {c.deliveryErrors.name && <p className={styles.errorText}>{c.deliveryErrors.name}</p>}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="co-address">العنوان</label>
        <textarea
          id="co-address"
          className={styles.textarea}
          rows={2}
          value={c.delivery.address}
          onChange={(e) => c.setDelivery({ ...c.delivery, address: e.target.value })}
        />
        {c.deliveryErrors.address && <p className={styles.errorText}>{c.deliveryErrors.address}</p>}
      </div>
      <p className={styles.hint}>بدون تسجيل — لو الرقم موجود عندنا هنربطه بحسابك تلقائيًا</p>
      <div className={styles.stepActions}>
        <span />
        <button type="button" className={styles.primaryBtn} onClick={c.submitDelivery}>متابعة</button>
      </div>
    </div>
  );
}

function ShippingStep({ c }: { c: UseCheckoutReturn }) {
  return (
    <div className={styles.panel}>
      <div className={styles.zoneList}>
        {c.zones.map((z) => (
          <button
            type="button"
            key={z.id}
            className={z.id === c.zoneId ? styles.zoneOptionActive : styles.zoneOption}
            onClick={() => c.setZoneId(z.id)}
          >
            <span>{z.label_ar}</span>
            <span className={styles.zoneCost}>{z.cost} ج.م</span>
          </button>
        ))}
      </div>
      <div className={styles.stepActions}>
        <button type="button" className={styles.secondaryBtn} onClick={() => c.setStep("delivery")}>رجوع</button>
        <button type="button" className={styles.primaryBtn} onClick={() => c.setStep("payment")}>متابعة</button>
      </div>
    </div>
  );
}

function PaymentStep({ c }: { c: UseCheckoutReturn }) {
  return (
    <div className={styles.panel}>
      <div className={styles.paymentList}>
        {PAYMENT_METHODS.map((m) => (
          <button
            type="button"
            key={m.id}
            className={m.id === c.paymentMethod ? styles.paymentOptionActive : styles.paymentOption}
            onClick={() => c.setPaymentMethod(m.id)}
          >
            <span>{m.label}</span>
            {m.note && <span className={styles.paymentNote}>{m.note}</span>}
          </button>
        ))}
      </div>
      <div className={styles.stepActions}>
        <button type="button" className={styles.secondaryBtn} onClick={() => c.setStep("shipping")}>رجوع</button>
        <button type="button" className={styles.primaryBtn} onClick={() => c.setStep("review")}>متابعة</button>
      </div>
    </div>
  );
}

function ReviewStep({ c, productById }: { c: UseCheckoutReturn; productById: Record<string, ProductStatic> }) {
  const reservationDead = !c.reservation || c.reservation.status !== "active";
  return (
    <div className={styles.panel}>
      <section className={styles.reviewSection}>
        <h2 className={styles.reviewHeading}>عناصر الطلب</h2>
        <div className={styles.reviewItems}>
          {c.cartItems.map((item) => (
            <div key={`${item.product_id}-${item.variant ?? ""}`} className={styles.reviewItem}>
              <span>
                {productById[item.product_id]?.title_ar ?? item.product_id}
                {item.variant ? ` — ${item.variant}` : ""} × {item.qty}
              </span>
              <span>{item.live_price * item.qty} ج.م</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.reviewSection}>
        <h2 className={styles.reviewHeading}>التوصيل</h2>
        <p className={styles.reviewValue}>{c.delivery.name} — {c.delivery.phone}</p>
        <p className={styles.reviewValue}>{c.delivery.address}</p>
        {c.crmMatch && <p className={styles.hint}>الرقم موجود لدينا بالفعل</p>}
      </section>

      <section className={styles.reviewSection}>
        <h2 className={styles.reviewHeading}>الشحن والدفع</h2>
        <p className={styles.reviewValue}>{c.zone?.label_ar} — {c.zone?.cost} ج.م</p>
        <p className={styles.reviewValue}>{PAYMENT_LABELS[c.paymentMethod]}</p>
      </section>

      <div className={styles.reviewRow}><span>الإجمالي الفرعي</span><span>{c.subtotal} ج.م</span></div>
      <div className={styles.reviewRow}><span>الشحن</span><span>{c.zone?.cost ?? 0} ج.م</span></div>
      <div className={styles.reviewTotal}><span>الإجمالي</span><span>{c.total} ج.م</span></div>

      {c.error === "payment_failed" && (
        <p className={styles.errorBanner}>
          <AlertTriangle size={14} /> فشلت عملية الدفع — حجزك لسه شغال، جرّب تاني
        </p>
      )}
      {c.error === "reservation_expired" && (
        <p className={styles.errorBanner}>
          <AlertTriangle size={14} /> انتهى وقت الحجز — لازم تعيد الحجز قبل التأكيد
        </p>
      )}
      {c.error === "race_out" && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} />
          <div>
            <p>بعض المنتجات نفدت أثناء إتمام الطلب:</p>
            <ul className={styles.blockedList}>
              {c.blockedItems.map((b) => (
                <li key={`${b.product_id}-${b.variant ?? ""}`}>
                  {productById[b.product_id]?.title_ar ?? b.product_id}{b.variant ? ` — ${b.variant}` : ""}
                </li>
              ))}
            </ul>
            <button type="button" className={styles.secondaryBtn} onClick={c.resolveRaceOut}>متابعة بالباقي</button>
          </div>
        </div>
      )}

      <div className={styles.stepActions}>
        <button type="button" className={styles.secondaryBtn} onClick={() => c.setStep("payment")}>رجوع</button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={c.confirmCheckout}
          disabled={c.submitting || reservationDead || c.isOffline}
        >
          {c.submitting ? "جارٍ التأكيد..." : "تأكيد الطلب"}
        </button>
      </div>
      {c.isOffline && <p className={styles.hint}>لا يوجد اتصال — لا يمكن بدء الدفع الآن</p>}
    </div>
  );
}

function ConfirmedStep({ c }: { c: UseCheckoutReturn }) {
  if (!c.order) return null;
  return (
    <div className={styles.confirmedPanel}>
      <p className={styles.confirmedEyebrow}>تم الطلب</p>
      <p className={styles.confirmedCode}>{c.order.code}</p>
      <p className={styles.confirmedStatus}>{STATUS_LABELS[c.order.status ?? ""] ?? c.order.status}</p>
      {c.order.invoice_id ? (
        <p className={styles.confirmedNote}>رقم الفاتورة: {c.order.invoice_id}</p>
      ) : (
        <p className={styles.confirmedNote}>بانتظار تأكيد الدفع من البنك — سيتم إصدار الفاتورة بعد التأكيد</p>
      )}
      {c.order.attributed_affiliate && (
        <p className={styles.confirmedNote}>طلب مُحال عبر شريك: {c.order.attributed_affiliate}</p>
      )}
      <Link href={`/track?code=${encodeURIComponent(c.order.code)}`} className={styles.trackLink}>
        تتبّع الطلب
      </Link>
      <Link href="/products" className={styles.browseLink}>مواصلة التسوّق</Link>
    </div>
  );
}
