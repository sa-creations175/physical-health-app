// On/off track: Green 700 when on, Stone when off, white knob, no shadow.
// Purely presentational; the parent button owns role="switch" and the tap
// target.
export default function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 w-[38px] h-[22px] rounded-full transition-colors ${
        on ? 'bg-green-700' : 'bg-stone'
      }`}
    >
      <span
        className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all"
        style={{ left: on ? 18 : 2 }}
      />
    </span>
  );
}
