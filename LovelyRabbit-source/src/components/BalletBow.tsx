/** Small, decorative ribbon mark. Kept as a vector so it stays crisp offline. */
export function BalletBow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ballet-bow ${className}`}
      viewBox="0 0 120 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M59 33C41 21 15 0 9 17C1 39 40 40 59 33ZM61 33C79 21 105 0 111 17C119 39 80 40 61 33Z" />
      <path d="M57 35C45 48 32 78 8 85M63 35C75 48 89 72 103 84L108 78C88 60 78 43 63 35M54 36C40 59 28 87 4 89" />
      <path d="M57 30Q60 27 64 31L64 36Q60 39 56 35Z" />
    </svg>
  );
}
