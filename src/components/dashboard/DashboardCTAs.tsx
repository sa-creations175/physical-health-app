import { Link } from 'react-router-dom';

export default function DashboardCTAs() {
  return (
    <section className="px-5 mt-6 mb-4 grid grid-cols-2 gap-2">
      <Link
        to="/log/strength"
        className="bg-green-deep text-ink rounded-xl py-3.5 text-center text-[13px] font-medium uppercase tracking-micro min-h-[48px] flex items-center justify-center"
      >
        Log session
      </Link>
      <button
        type="button"
        disabled
        aria-label="Log nutrition (arrives in Phase 3)"
        className="bg-card border border-card-edge text-ink-mute rounded-xl py-3.5 text-center text-[13px] font-medium uppercase tracking-micro min-h-[48px] flex items-center justify-center opacity-60 cursor-not-allowed"
      >
        Log nutrition
      </button>
    </section>
  );
}
