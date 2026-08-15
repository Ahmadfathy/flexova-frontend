import { useAppearance } from "@/stores/appearance";

/** Logo mark only — sized to slot into the rail-width column (see PosTopBar). */
export function PosBrandLogo() {
  const { branding } = useAppearance();

  return (
    <span className="flex items-center justify-center h-9 w-9 rounded bg-brand-tint text-brand-text font-bold text-sm shrink-0 overflow-hidden">
      {branding.logoUrl
        ? <img src={branding.logoUrl} alt="" className="h-7 w-7 object-contain" />
        : "F"}
    </span>
  );
}
