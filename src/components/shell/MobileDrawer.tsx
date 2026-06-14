import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sidebar } from "./Sidebar";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 max-w-[280px] h-full start-0 top-0 translate-x-0 translate-y-0 rounded-none border-e border-border inset-y-0 ms-0 me-auto data-[state=open]:slide-in-from-start data-[state=closed]:slide-out-to-start">
        <Sidebar onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
