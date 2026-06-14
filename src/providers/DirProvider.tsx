import { DirectionProvider } from "@radix-ui/react-direction";
import { useAppearance, dirOf } from "@/stores/appearance";

export function DirProvider({ children }: { children: React.ReactNode }) {
  const lang = useAppearance((s) => s.lang);
  return <DirectionProvider dir={dirOf(lang)}>{children}</DirectionProvider>;
}
