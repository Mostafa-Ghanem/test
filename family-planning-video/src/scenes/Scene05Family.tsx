import React from 'react';
import {Img, staticFile} from 'remotion';
import {beats, lines, scenes} from '../data/timing';
import {Key, ramp} from '../utils/easing';

/** Scene 5 — empowerment and relief; reframes follow the speakers, then open up for the vignette. */
export const scene5Camera: Key<[number, number, number]>[] = [
  [scenes.scene5.start + 36, [545, 985, 1.05]],
  [lines.L09.start + 22, [505, 1000, 1.08]],
  [beats.vignetteIn, [540, 960, 1.0]],
  [scenes.scene5.end + 6, [540, 955, 1.03]],
];

/** Family-spacing vignette (feathered crop of the approved scene-5 reference). Silent, softly floating. */
export const FamilyVignette: React.FC<{frame: number}> = ({frame: f}) => {
  const a = ramp(f, beats.vignetteIn, beats.vignetteIn + 24) * (1 - ramp(f, beats.vignetteOut, beats.vignetteOut + 14));
  if (a <= 0) return null;
  const s = 0.96 + 0.04 * ramp(f, beats.vignetteIn, beats.vignetteIn + 40);
  const fl = Math.sin(f / 30 * 0.9) * 4;
  const W = 600, H = 440;
  return (
    <div style={{position: 'absolute', left: 540 - W / 2, top: 200, width: W, height: H, opacity: a, transform: `translateY(${fl}px) scale(${s})`}}>
      <div style={{position: 'absolute', inset: -40, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0))'}} />
      <Img src={staticFile('derived/family_vignette.png')} style={{position: 'absolute', inset: 0, width: W, height: H}} />
    </div>
  );
};
