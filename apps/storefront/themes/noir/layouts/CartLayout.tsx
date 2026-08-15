"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CartLayoutProps } from "@/lib/core/theme-contract";
import { useCart, computeSubtotal, isItemBlocked } from "@/lib/core/cart";
import { useCartRecheck } from "@/lib/core/useCartRecheck";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { CartLine } from "../components/CartLine";
import { CouponBox } from "../components/CouponBox";
import { OfflineBanner } from "../components/OfflineBanner";
import styles from "./CartLayout.module.css";

const STORE_NAME = "متجر النيل";

export function CartLayout({ catalog }: CartLayoutProps) {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);
  const { dynamicByProduct, isOffline } = useCartRecheck();
  const [discountPct, setDiscountPct] = useState(0);

  const productById = useMemo(() => Object.fromEntries(catalog.map((p) => [p.id, p])), [catalog]);

  const subtotal = computeSubtotal(items);
  const discount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discount;
  const hasBlocked = items.some((it) => isItemBlocked(dynamicByProduct[it.product_id]));

  return (
    <div className={styles.page}>
      <Header storeName={STORE_NAME} />

      <div className={styles.body}>
        <p className={styles.eyebrow}>سلة التسوّق</p>

        {isOffline && <OfflineBanner />}

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>سلتك فاضية</p>
            <Link href="/products" className={styles.browseLink}>تصفّح المنتجات</Link>
          </div>
        ) : (
          <>
            {hasBlocked && <p className={styles.blockedBanner}>يوجد منتج غير متوفّر — عدّله أو أزِله للمتابعة</p>}

            <div className={styles.lines}>
              {items.map((item) => (
                <CartLine
                  key={`${item.product_id}-${item.variant ?? ""}`}
                  item={item}
                  product={productById[item.product_id]}
                  dynamic={dynamicByProduct[item.product_id]}
                  onQtyChange={(qty) => setQty(item.product_id, item.variant, qty)}
                  onRemove={() => removeItem(item.product_id, item.variant)}
                />
              ))}
            </div>

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>الإجمالي الفرعي</span>
                <span>{subtotal} ج.م</span>
              </div>
              {discountPct > 0 && (
                <div className={styles.summaryRow}>
                  <span>الخصم</span>
                  <span>-{discount} ج.م</span>
                </div>
              )}
              <div className={styles.summaryTotal}>
                <span>الإجمالي</span>
                <span>{total} ج.م</span>
              </div>
              <p className={styles.shippingNote}>الشحن يُحسب في صفحة الدفع</p>

              <CouponBox onApply={setDiscountPct} />

              <Link
                href={hasBlocked ? "#" : "/checkout"}
                aria-disabled={hasBlocked}
                className={hasBlocked ? styles.checkoutBtnDisabled : styles.checkoutBtn}
                onClick={(e) => hasBlocked && e.preventDefault()}
              >
                إتمام الشراء
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer storeName={STORE_NAME} />
    </div>
  );
}
