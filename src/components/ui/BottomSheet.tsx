import type { ReactNode } from 'react';
import { X } from 'lucide-react';

// The one bottom sheet (PERSONAL_OS_BRAND.md section 6): dark scrim at 40%,
// white panel with 20px top corners, up to 85% height, × to close top right.
// Tapping the scrim closes; taps inside the panel don't.
export default function BottomSheet({
  onClose,
  children,
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <SheetClose onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

export function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-2 top-2 w-11 h-11 flex items-center justify-center text-hint"
    >
      <X size={20} strokeWidth={2} />
    </button>
  );
}
