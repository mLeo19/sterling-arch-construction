import { forwardRef } from "react";

// A real 6-face 3D CSS cube (translateZ'd faces + preserve-3d), used as the
// intro loader's spinner. Faces are plain tinted planes (currentColor at
// varying opacity, a cheap directional-light look), not the brand mark
// itself - the flat BrandMark crossfades in once the cube settles into the
// same hexagon silhouette (see IntroSequence.tsx).
export const BrandCube = forwardRef<HTMLDivElement, { size?: number }>(
  function BrandCube({ size = 34 }, ref) {
    const half = size / 2;
    const faces: { transform: string; opacity: number }[] = [
      { transform: `translateZ(${half}px)`, opacity: 1 },
      { transform: `rotateY(180deg) translateZ(${half}px)`, opacity: 0.55 },
      { transform: `rotateY(90deg) translateZ(${half}px)`, opacity: 0.82 },
      { transform: `rotateY(-90deg) translateZ(${half}px)`, opacity: 0.7 },
      { transform: `rotateX(90deg) translateZ(${half}px)`, opacity: 0.92 },
      { transform: `rotateX(-90deg) translateZ(${half}px)`, opacity: 0.62 },
    ];

    return (
      <div
        ref={ref}
        className="text-black"
        style={{
          width: size,
          height: size,
          position: "relative",
          transformStyle: "preserve-3d",
        }}
      >
        {faces.map((face, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "currentColor",
              opacity: face.opacity,
              transform: face.transform,
            }}
          />
        ))}
      </div>
    );
  },
);
