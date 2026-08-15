import styles from "./Gallery.module.css";

/** Static (spec §4.1) — no real product photography in the fixture (just
 * filenames), so this renders placeholder tiles the same way ProductCard's
 * image box does elsewhere in this theme. Swapping in `next/image` is a
 * drop-in once real asset URLs exist — the count/thumbnails structure
 * below is already what that would slot into. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  return (
    <div className={styles.gallery}>
      <div className={styles.main} role="img" aria-label={title} />
      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.map((img, i) => (
            <div key={img + i} className={styles.thumb} />
          ))}
        </div>
      )}
    </div>
  );
}
