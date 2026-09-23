import { X } from 'lucide-react';

// Close control for full-screen overlays, sitting in the header strip's right
// slot. Same white circle as the Settings control on Home.
export default function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="w-11 h-11 rounded-full bg-white border border-hairline flex items-center justify-center text-ink"
    >
      <X size={18} strokeWidth={2} />
    </button>
  );
}
