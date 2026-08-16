import { PlaceholderImage } from "./PlaceholderImage";
import styles from "./Gallery.module.css";

/** Static (spec §4.1). Real `next/image` (spec §1/§4.5/§11.6) — see
 * `PlaceholderImage`'s comment for why it points at a local placeholder
 * instead of a real photo (the fixture only carries bare filenames, no
 * asset URL). Every thumbnail is its own `next/image` too, not just the
 * main tile, so the count/thumbnails structure is already what swapping in
 * real per-image URLs would slot straight into. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  return (
    <div className={styles.gallery}>
      <div className={styles.main} role="img" aria-label={title}>
        <PlaceholderImage alt={title} />
      </div>
      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.map((img, i) => (
            <div key={img + i} className={styles.thumb}>
              <PlaceholderImage alt={`${title} — ${i + 1}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
