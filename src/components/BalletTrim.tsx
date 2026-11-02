/** Decorative lace and lacing; never part of the interactive hit area. */
export function BalletLace({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ballet-lace ${className}`}
      viewBox="0 0 240 12"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth=".7"
      aria-hidden="true"
    >
      <path d="M0 1H240" />
      {Array.from({ length: 20 }, (_, i) => (
        <g key={i} transform={`translate(${i * 12} 0)`}>
          <path d="M0 1C0 12 12 12 12 1M3 1Q6 9 9 1" />
          <circle cx="6" cy="10" r=".6" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}
export function BalletLacing() {
  return (
    <svg
      className="ballet-lacing"
      viewBox="0 0 14 64"
      fill="none"
      stroke="currentColor"
      strokeWidth=".7"
      aria-hidden="true"
    >
      <path d="M2 2L12 14L2 26L12 38L2 50L12 62M12 2L2 14L12 26L2 38L12 50L2 62" />
      {[2, 14, 26, 38, 50, 62].map((y) => (
        <g key={y}>
          <circle cx="2" cy={y} r="1.2" />
          <circle cx="12" cy={y} r="1.2" />
        </g>
      ))}
    </svg>
  );
}
