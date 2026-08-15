"use client";

import { useState } from "react";
import styles from "./CouponBox.module.css";

const VALID_CODE = "NILE10";
const DISCOUNT_PCT = 10;

export function CouponBox({ onApply }: { onApply: (pct: number) => void }) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState(false);

  function handleApply() {
    if (code.trim().toUpperCase() === VALID_CODE) {
      setApplied(true);
      setError(false);
      onApply(DISCOUNT_PCT);
    } else {
      setError(true);
      setApplied(false);
    }
  }

  return (
    <div className={styles.box}>
      <div className={styles.row}>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false); }}
          placeholder="كود الخصم"
          className={styles.input}
          disabled={applied}
        />
        <button type="button" className={styles.applyBtn} onClick={handleApply} disabled={applied || !code.trim()}>
          {applied ? "تم" : "تطبيق"}
        </button>
      </div>
      {error && <p className={styles.error}>كود غير صالح</p>}
      {applied && <p className={styles.success}>خصم {DISCOUNT_PCT}% مُطبّق</p>}
    </div>
  );
}
