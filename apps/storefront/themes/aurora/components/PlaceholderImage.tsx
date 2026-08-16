import Image from "next/image";
import styles from "./PlaceholderImage.module.css";

/**
 * The fixture only ever carries bare filenames (`"shirt1_a.jpg"`, no real
 * asset path — spec §3 `OnlineProduct.images`), so there's no real photo to
 * point `next/image` at yet. This is the honest middle ground: a real
 * `next/image` (spec §1 "Images: next/image + CDN/reverse-proxy
 * optimization", §4.5, §11.6) rendering a local placeholder — not a bare
 * `<div>` — so the moment real asset URLs exist, swapping `src` here is the
 * *only* change needed everywhere a product image appears. `unoptimized`
 * because a vector placeholder has nothing to optimize; a real photo
 * wouldn't set it.
 */
export function PlaceholderImage({ alt }: { alt: string }) {
  return (
    <Image
      src="/placeholder-product.svg"
      alt={alt}
      fill
      unoptimized
      sizes="(max-width: 640px) 50vw, 300px"
      className={styles.img}
    />
  );
}
