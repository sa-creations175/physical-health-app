import { Target } from 'lucide-react';

// The small "Goals" pill at the right of a header's eyebrow line
// (body-fitness-options.html). One piece for every tab that has goals: each
// passes what its goals are called and what opening them does (Fitness opens
// Your goals today; Nutrition, Sleep and More will open their own).
export default function GoalsPill({ onOpen, label = 'Goals' }: { onOpen: () => void; label?: string }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Open ${label.toLowerCase()}`} className="-my-2 py-2 shrink-0">
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white border border-hairline px-2.5 py-0.5 text-label font-bold text-green-700">
        <Target aria-hidden="true" size={13} strokeWidth={2} />
        {label}
      </span>
    </button>
  );
}
