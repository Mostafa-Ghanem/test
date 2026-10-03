import React from 'react';
import {Img, staticFile} from 'remotion';

/**
 * A rectangular region of a supplied background re-layered so it can move
 * independently (props, crib, palm…). `backing` paints the surrounding flat
 * colour underneath so the static original never ghosts.
 */
export const BgPiece: React.FC<{
  src: string;
  box: [x: number, y: number, w: number, h: number];
  origin: [number, number]; // pivot, in box-local px
  transform: string;
  backing?: string;
  radius?: number;
}> = ({src, box: [x, y, w, h], origin, transform, backing, radius = 0}) => (
  <>
    {backing ? <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: backing}} /> : null}
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', borderRadius: radius,
        transformOrigin: `${origin[0]}px ${origin[1]}px`, transform,
      }}
    >
      <Img src={staticFile(src)} style={{position: 'absolute', left: -x, top: -y, width: 1080, height: 1920}} />
    </div>
  </>
);
