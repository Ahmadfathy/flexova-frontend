import { PlaceholderImage } from "./PlaceholderImage";
import styles from "./Gallery.module.css";

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
