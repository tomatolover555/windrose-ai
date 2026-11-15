export function CompassMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="17" stroke="#b8941e" strokeWidth="1.4" />
      <polygon points="22,1.5 23.2,5 22,4.2 20.8,5" fill="#16325c" />
      <polygon points="22,42.5 23.2,39 22,39.8 20.8,39" fill="#16325c" />
      <polygon points="42.5,22 39,23.2 39.8,22 39,20.8" fill="#b8941e" />
      <polygon points="1.5,22 5,23.2 4.2,22 5,20.8" fill="#b8941e" />
      <circle cx="34" cy="10" r="1.25" fill="#b8941e" />
      <circle cx="34" cy="34" r="1.25" fill="#b8941e" />
      <circle cx="10" cy="34" r="1.25" fill="#b8941e" />
      <circle cx="10" cy="10" r="1.25" fill="#b8941e" />
      <polygon points="22,4.5 26.2,19 39.5,22 26.2,25 22,39.5 17.8,25 4.5,22 17.8,19" fill="#16325c" />
      <polygon points="22,9 24.6,19.4 32.5,22 24.6,24.6 22,35 19.4,24.6 11.5,22 19.4,19.4" fill="#c6a24e" />
      <circle cx="22" cy="22" r="2.3" fill="#f7f6f3" stroke="#16325c" strokeWidth="1" />
    </svg>
  );
}
