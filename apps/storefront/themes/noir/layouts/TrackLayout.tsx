import Link from "next/link";
import type { TrackLayoutProps } from "@/lib/core/theme-contract";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import styles from "./TrackLayout.module.css";

const STORE_NAME = "متجر النيل";
const STAGES: { id: string; label: string }[] = [
  { id: "confirmed", label: "تم التأكيد" },
  { id: "processing", label: "قيد التجهيز" },
  { id: "shipped", label: "تم الشحن" },
  { id: "delivered", label: "تم التسليم" },
];

/** noir's tracking — same SSR `TrackLayoutProps` as aurora's, a flat
 * numbered-list timeline instead of an icon stepper, no card border. */
export function TrackLayout({ code, isOffline, order }: TrackLayoutProps) {
  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />
      <div className={styles.body}>
        <p className={styles.eyebrow}>تتبّع الطلب</p>

        <form action="/track" method="get" className={styles.form}>
          <input
            name="code"
            defaultValue={code}
            placeholder="كود الطلب (مثال: EC-5001)"
            className={styles.input}
            dir="ltr"
          />
          <button type="submit" className={styles.submitBtn}>بحث</button>
        </form>

        {isOffline && (
          <div className={styles.stateBox}>
            <p>لا يوجد اتصال بالإنترنت — تعذّر التحقق من حالة الطلب</p>
            <Link href={`/track${code ? `?code=${encodeURIComponent(code)}` : ""}`} className={styles.retryLink}>
              إعادة المحاولة
            </Link>
          </div>
        )}

        {!isOffline && code && !order && (
          <div className={styles.stateBox}>
            <p>لم نجد هذا الطلب</p>
            <p className={styles.hint}>تأكّد من كود الطلب الموجود في رسالة التأكيد</p>
          </div>
        )}

        {!isOffline && order && (
          <div className={styles.result}>
            <p className={styles.code}>{order.code}</p>

            {order.timeline.length === 0 ? (
              <p className={styles.pendingNote}>بانتظار تأكيد الدفع — سيظهر تتبّع الطلب بعد التأكيد</p>
            ) : (
              <ol className={styles.timeline}>
                {STAGES.map((stage, i) => {
                  const done = order.timeline.includes(stage.id);
                  const current = order.timeline[order.timeline.length - 1] === stage.id;
                  return (
                    <li key={stage.id} className={done ? styles.stageDone : styles.stagePending}>
                      <span className={styles.stageNum}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={current ? styles.stageCurrentLabel : undefined}>{stage.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {(order.carrier || order.tracking_no) && (
              <div className={styles.carrierBox}>
                {order.carrier && <p>شركة الشحن: {order.carrier}</p>}
                {order.tracking_no && <p dir="ltr">رقم التتبّع: {order.tracking_no}</p>}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer storeName={STORE_NAME} />
    </div>
  );
}
