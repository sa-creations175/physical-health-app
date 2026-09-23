import { COLOR } from '../lib/brand';

export default function Health() {
  return (
    <div className="px-5 pt-8 pb-4">
      <h1 className="text-title text-ink">Health</h1>
      <div
        className="mt-4 rounded-2xl p-5 shadow-card"
        style={{ background: COLOR.green100 }}
      >
        <p className="text-body text-ink leading-snug">
          Track doctor, dentist, and other appointments — coming in a future
          update.
        </p>
        <p className="mt-3 text-label text-hint">
          Doctor · Dental · Dermatologist
        </p>
      </div>
    </div>
  );
}
