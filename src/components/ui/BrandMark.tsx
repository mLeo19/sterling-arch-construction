export function BrandMark({
  className = "",
  strokeWidth = 2.4,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 42 42" fill="none" className={className} aria-hidden>
      {/* Hexagon outline - kept as a regular hexagon (not redrawn into some
          other silhouette) because IntroSequence's cube rests at an isometric
          angle specifically tuned to project a regular hexagon; swapping in a
          differently-shaped mark here would make that cube-to-icon hard cut
          visibly mismatch. */}
      <polygon
        points="21,3 37.5,12.5 37.5,29.5 21,39 4.5,29.5 4.5,12.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Round-top arch, in place of Northfield's house pictogram - the one
          piece of this mark that's actually brand-specific. */}
      <path
        d="M15 29 V21 A6 6 0 0 1 27 21 V29"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
