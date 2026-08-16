"use client";

import { useState } from "react";
import { useCart } from "@/lib/core/cart";
import { getAddToCartGate, variantLabel } from "@/lib/core/pdp";
import type { ProductDynamic, ProductStatic } from "@/lib/core/types";
import styles from "./PriceAndCart.module.css";

interface PriceAndCartProps {
  dynamic: ProductDynamic;
  product: ProductStatic;
}

export function PriceAndCart({ dynamic, product }: PriceAndCartProps) {
  const addItem = useCart((s) => s.addItem);
  const [selected, setSelected] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [notifyMe, setNotifyMe] = useState(false);

  const { hasVariants, priceUnknown, productOutOfStock, variantRequired, canAddToCart } = getAddToCartGate(
    product,
    dynamic,
    selected
  );

  function handleAddToCart() {
    if (!canAddToCart || dynamic.price == null) return;
    addItem({
      product_id: product.id,
      variant: selected,
      qty: 1,
      price_at_add: dynamic.price,
      live_price: dynamic.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className={styles.block}>
      <div className={styles.priceRow}>
        {priceUnknown ? (
          <span className={styles.priceFallback}>تأكّد من التوفّر</span>
        ) : (
          <>
            <span className={styles.price}>{dynamic.price} ج.م</span>
            {dynamic.list_price && <span className={styles.listPrice}>{dynamic.list_price} ج.م</span>}
          </>
        )}
      </div>
      {productOutOfStock && <p className={styles.oosNote}>غير متوفّر حالياً</p>}
      {dynamic.offer && !productOutOfStock && <p className={styles.offerNote}>عرض خاص</p>}

      {hasVariants && (
        <div className={styles.variants}>
          <p className={styles.variantsLabel}>المقاس / اللون</p>
          <div className={styles.variantRow}>
            {product.variants!.map((v) => {
              const label = variantLabel(v);
              const disabled = v.available <= 0;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected(label)}
                  className={selected === label ? styles.variantActive : styles.variant}
                  aria-pressed={selected === label}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {variantRequired && <p className={styles.hint}>اختر خيارًا للمتابعة</p>}
        </div>
      )}

      {productOutOfStock ? (
        <button type="button" className={styles.notifyBtn} onClick={() => setNotifyMe(true)} disabled={notifyMe}>
          {notifyMe ? "سيتم إشعارك عند التوفّر" : "أبلغني عند التوفّر"}
        </button>
      ) : (
        <button type="button" className={styles.addBtn} disabled={!canAddToCart} onClick={handleAddToCart}>
          {added ? "تمت الإضافة" : "أضف للسلة"}
        </button>
      )}
    </div>
  );
}
