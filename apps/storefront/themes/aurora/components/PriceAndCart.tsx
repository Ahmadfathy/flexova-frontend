"use client";

import { useState } from "react";
import { CheckCircle2, BellRing } from "lucide-react";
import { useCart } from "@/lib/core/cart";
import type { ProductDynamic, ProductStatic } from "@/lib/core/types";
import styles from "./PriceAndCart.module.css";

function variantLabel(v: { size?: string; color?: string }): string {
  return v.color ? `${v.size}/${v.color}` : (v.size ?? "");
}

interface PriceAndCartProps {
  dynamic: ProductDynamic;
  product: ProductStatic;
}

/**
 * The one genuinely interactive part of the PDP (spec §4.1 "variant
 * selector: interactive (client)"). Receives the already-resolved live
 * price/availability from `ProductAvailabilityIsland` — never fetches
 * anything itself, and never sells on missing/failed data (spec §4.4):
 * an ERP read failure or a null price disables Add to cart just like a
 * real out-of-stock read does, it just shows a different message.
 */
export function PriceAndCart({ dynamic, product }: PriceAndCartProps) {
  const addItem = useCart((s) => s.addItem);
  const [selected, setSelected] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [notifyMe, setNotifyMe] = useState(false);

  const hasVariants = (product.variants?.length ?? 0) > 0;
  const selectedVariant = product.variants?.find((v) => variantLabel(v) === selected);
  const priceUnknown = dynamic.erp_error || dynamic.price == null;
  const productOutOfStock = dynamic.in_stock === false;
  const variantOutOfStock = hasVariants && !!selectedVariant && selectedVariant.available <= 0;
  const variantRequired = hasVariants && !selected;

  const canAddToCart = !priceUnknown && !productOutOfStock && !variantRequired && !variantOutOfStock;

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
        {productOutOfStock && <span className={styles.oosBadge}>غير متوفّر حالياً</span>}
        {dynamic.offer && !productOutOfStock && <span className={styles.offerBadge}>عرض</span>}
      </div>

      {hasVariants && (
        <div className={styles.variants}>
          <p className={styles.variantsLabel}>اختر المقاس/اللون</p>
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
                  {disabled && <span className={styles.variantOos}> (غير متوفر)</span>}
                </button>
              );
            })}
          </div>
          {variantRequired && <p className={styles.hint}>اختر خيارًا للمتابعة</p>}
        </div>
      )}

      {productOutOfStock ? (
        <button type="button" className={styles.notifyBtn} onClick={() => setNotifyMe(true)} disabled={notifyMe}>
          <BellRing size={16} />
          {notifyMe ? "سيتم إشعارك عند التوفّر" : "أبلغني عند التوفّر"}
        </button>
      ) : (
        <button type="button" className={styles.addBtn} disabled={!canAddToCart} onClick={handleAddToCart}>
          {added ? (
            <>
              <CheckCircle2 size={16} /> تمت الإضافة للسلة
            </>
          ) : (
            "أضف للسلة"
          )}
        </button>
      )}
    </div>
  );
}
