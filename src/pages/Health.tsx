export default function Health() {
  return (
    <div className="px-5 pt-8 pb-4">
      <h1 className="text-[22px] font-medium text-ink">Health</h1>
      <div
        className="mt-4 rounded-2xl p-5 shadow-card"
        style={{ background: '#edf7f2' }}
      >
        <p className="text-[14px] text-ink leading-snug">
          Track doctor, dentist, and other appointments — coming in a future
          update.
        </p>
        <p className="mt-3 text-[12px] text-dim">
          Doctor · Dental · Dermatologist
        </p>
      </div>
    </div>
  );
}
