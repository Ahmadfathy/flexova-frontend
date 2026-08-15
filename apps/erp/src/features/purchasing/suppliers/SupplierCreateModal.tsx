import { SupplierFormModal } from "./SupplierFormModal";

interface SupplierCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierCreateModal({ open, onOpenChange }: SupplierCreateModalProps) {
  return (
    <SupplierFormModal
      open={open}
      onOpenChange={onOpenChange}
      supplier={null}
      onSaved={() => {}}
    />
  );
}
