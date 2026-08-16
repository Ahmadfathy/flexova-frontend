import Image from "next/image";
import styles from "./PlaceholderImage.module.css";

/** Same reasoning as aurora's — see that file's comment. Slightly lower
 * opacity here since noir's surfaces are dark and the placeholder glyph is
 * a fixed mid-gray, not theme-aware. */
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
