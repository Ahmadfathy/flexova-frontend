import { WifiOff } from "lucide-react";
import styles from "./OfflineBanner.module.css";

/** spec §6 "offline: saved locally; re-check waits" — shown instead of the
 * live re-check result while `?mock=offline` is active. */
export function OfflineBanner() {
  return (
    <div className={styles.banner}>
      <WifiOff size={16} />
      لا يوجد اتصال بالإنترنت — سلتك محفوظة محليًا، سيتم التحقق من الأسعار عند عودة الاتصال
    </div>
  );
}
