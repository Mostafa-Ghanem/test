import React from 'react';
import {Img, interpolate, spring, staticFile} from 'remotion';
import {FPS} from '../data/timing';

export type IconKind = 'iud' | 'pills' | 'injection' | 'implant' | 'breastfeeding';

const FILE: Record<IconKind, string> = {
  iud: 'icons/iud.svg', pills: 'icons/pills.svg', injection: 'icons/injection.svg',
  implant: 'icons/implant.svg', breastfeeding: 'icons/breastfeeding_heart.svg',
};
const TINT: Record<IconKind, string> = {
  iud: '#E3F3EF', pills: '#E6F0FA', injection: '#F8E6EA', implant: '#ECE6F6', breastfeeding: '#E1F2EE',
};
const RING: Record<IconKind, string> = {
  iud: '#9CCFC3', pills: '#A9C6E3', injection: '#E5AEBB', implant: '#C3B4E0', breastfeeding: '#94CBBE',
};

/** Pastel badge holding a supplied SVG icon; each kind has its own restrained entrance. */
export const MedicalIcon: React.FC<{kind: IconKind; x: number; y: number; size: number; frame: number; cue: number; outAt: number}> = ({
  kind, x, y, size, frame, cue, outAt,
}) => {
  const t = frame - cue;
  if (t < 0) return null;
  const s = spring({frame: t, fps: FPS, config: {damping: 22, stiffness: 120, mass: 0.9}}); // low overshoot
  const fadeIn = interpolate(t, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const out = interpolate(frame, [outAt, outAt + 14], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  let tx = 0, ty = 0, sc = 1;
  if (kind === 'iud') sc = 0.82 + 0.18 * s; // gentle scale/fade pop
  if (kind === 'pills') ty = (1 - s) * 34; // fade + small rise
  if (kind === 'injection') tx = (1 - s) * -46; // short soft slide
  if (kind === 'implant') sc = 0.6 + 0.4 * s; // clean scale-in
  if (kind === 'breastfeeding') sc = 0.94 + 0.06 * s; // soft fade
  const float = Math.sin((frame + x) / 38) * 3;
  // heart pulse: re-layer the heart region of the same SVG and scale it (≥1 so it always covers the original)
  const pulse = kind === 'breastfeeding' ? 1 + 0.07 * Math.max(0, Math.sin((t / FPS) * Math.PI * 1.6)) * fadeIn : 1;
  const inner = size * 0.74;
  return (
    <div
      style={{
        position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%',
        background: TINT[kind], border: `5px solid ${RING[kind]}`, boxShadow: '0 10px 26px rgba(40,90,85,0.16)',
        opacity: fadeIn * out, transform: `translate(${tx}px, ${ty + float}px) scale(${sc})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
      }}
    >
      <div style={{position: 'relative', width: inner, height: inner}}>
        <Img src={staticFile(FILE[kind])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain'}} />
        {kind === 'breastfeeding' ? (
          // heart occupies x 140–212, y 55–121 of the 240×220 viewBox (rendered contain → letterboxed vertically)
          <div
            style={{
              position: 'absolute', inset: 0, clipPath: 'inset(25% 10% 43% 56%)',
              transformOrigin: '73% 41%',
              transform: `scale(${pulse})`,
            }}
          >
            <Img src={staticFile(FILE[kind])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain'}} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
