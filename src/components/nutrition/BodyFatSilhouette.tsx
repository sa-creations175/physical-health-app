// A parametric male-physique silhouette for the body-fat reference grid.
// `level` 0 (leanest) … 5 (highest) drives three readable signals: waist width
// (narrow → wide), ab definition (a six-pack that fades out), and a soft belly
// curve at the top end. Inline SVG so it's self-contained and works offline —
// no external image dependency.
export default function BodyFatSilhouette({ level }: { level: number }) {
  const cx = 36;
  const shoulderY = 28;
  const waistY = 92;

  // V-taper relaxes a little and the waist widens substantially as BF rises.
  const shoulderHalf = 28 - level * 0.8;
  const waistHalf = 12 + level * 2.6;
  const bulge = level >= 4 ? (level - 3) * 5 : 0; // belly pushes the sides out
  const sideCtrl = waistHalf + bulge;

  const torso = [
    `M ${cx - shoulderHalf} ${shoulderY}`,
    `C ${cx - shoulderHalf} ${shoulderY + 18}, ${cx - sideCtrl} ${waistY - 16}, ${cx - waistHalf} ${waistY}`,
    `Q ${cx} ${waistY + 7} ${cx + waistHalf} ${waistY}`,
    `C ${cx + sideCtrl} ${waistY - 16}, ${cx + shoulderHalf} ${shoulderY + 18}, ${cx + shoulderHalf} ${shoulderY}`,
    `Q ${cx} ${shoulderY - 12} ${cx - shoulderHalf} ${shoulderY}`,
    'Z',
  ].join(' ');

  const fill = '#cdd6d0';
  const stroke = '#9aa8a0';
  const line = '#5f6b65';

  const abRows = [3, 3, 2, 1, 0, 0][level];
  const midlineOpacity = [0.85, 0.7, 0.55, 0.35, 0, 0][level];
  const abTop = shoulderY + 26;
  const abGap = 9;
  const abHalf = Math.max(6, waistHalf - 8);

  return (
    <svg viewBox="0 0 72 104" width="100%" height="100%" role="img" aria-hidden="true">
      {/* head + neck */}
      <circle cx={cx} cy={12} r={7} fill={fill} stroke={stroke} strokeWidth="1.5" />
      <rect x={cx - 4} y={17} width={8} height={8} fill={fill} />
      {/* torso */}
      <path
        d={torso}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* pec separation — only reads on lean levels */}
      {level <= 2 && (
        <path
          d={`M ${cx - 13} ${shoulderY + 12} Q ${cx} ${shoulderY + 18} ${cx + 13} ${shoulderY + 12}`}
          fill="none"
          stroke={line}
          strokeOpacity={0.5 - level * 0.12}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}

      {/* linea alba (vertical midline) */}
      {midlineOpacity > 0 && (
        <line
          x1={cx}
          y1={abTop - 2}
          x2={cx}
          y2={abTop + abRows * abGap}
          stroke={line}
          strokeOpacity={midlineOpacity}
          strokeWidth="1.3"
        />
      )}

      {/* ab cut rows — fewer + fainter as BF rises */}
      {Array.from({ length: abRows }, (_, i) => {
        const y = abTop + i * abGap;
        return (
          <line
            key={i}
            x1={cx - abHalf}
            y1={y}
            x2={cx + abHalf}
            y2={y}
            stroke={line}
            strokeOpacity={midlineOpacity * (1 - i * 0.12)}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        );
      })}

      {/* soft belly curve replaces definition at the high end */}
      {level >= 4 && (
        <path
          d={`M ${cx - waistHalf + 4} ${waistY - 22} Q ${cx} ${waistY - 8} ${cx + waistHalf - 4} ${waistY - 22}`}
          fill="none"
          stroke={line}
          strokeOpacity={0.28}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
