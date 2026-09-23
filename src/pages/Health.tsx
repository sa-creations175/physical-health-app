import HeaderStrip from '../components/ui/HeaderStrip';

export default function Health() {
  return (
    <div className="pb-4">
      <HeaderStrip eyebrow="Body · Health" title="Health" />
      <div className="px-4">
      <div className="tile mt-4 p-4">
        <p className="text-body text-ink leading-snug">
          Track doctor, dentist, and other appointments — coming in a future
          update.
        </p>
        <p className="mt-3 text-label text-hint">
          Doctor · Dental · Dermatologist
        </p>
      </div>
      </div>
    </div>
  );
}
