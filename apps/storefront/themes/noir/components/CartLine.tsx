import type { CartItem, ProductStatic, ProductDynamic } from "@/lib/core/types";
import { isItemBlocked, isPriceChanged } from "@/lib/core/cart";
import { PlaceholderImage } from "./PlaceholderImage";
import styles from "./CartLine.module.css";

interface CartLineProps {
  item: CartItem;
  product?: ProductStatic;
  dynamic?: ProductDynamic;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

export function CartLine({ item, product, dynamic, onQtyChange, onRemove }: CartLineProps) {
  const blocked = isItemBlocked(dynamic);
  const priceChanged = isPriceChanged(item, dynamic);

  return (
    <div className={styles.line}>
      <div className={styles.imageBox}>
        <PlaceholderImage alt={product?.title_ar ?? item.product_id} />
      </div>
      <div className={styles.info}>
        <span className={styles.title}>{product?.title_ar ?? item.product_id}</span>
        {item.variant && <span className={styles.variant}>{item.variant}</span>}
        {blocked && <p className={styles.blockedNote}>غير متوفّر حالياً</p>}
        {!blocked && priceChanged && <p className={styles.priceChangedNote}>السعر اتحدّث: {item.live_price} ج.م</p>}
        <div className={styles.qtyRow}>
          <button type="button" onClick={() => onQtyChange(item.qty - 1)} className={styles.qtyBtn} aria-label="تقليل">−</button>
          <span className={styles.qtyValue}>{item.qty}</span>
          <button type="button" onClick={() => onQtyChange(item.qty + 1)} className={styles.qtyBtn} aria-label="زيادة">+</button>
          <button type="button" onClick={onRemove} className={styles.removeBtn}>إزالة</button>
        </div>
      </div>
      <span className={styles.lineTotal}>{item.live_price * item.qty} ج.م</span>
    </div>
  );
}
