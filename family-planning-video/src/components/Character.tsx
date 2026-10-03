import React from 'react';
import {Img, staticFile} from 'remotion';
import {ANCHORS} from '../data/pack.generated';
import type {CharacterId} from '../data/lipSync';

/** Opaque-content bottom row (feet) of each sprite, measured from its alpha bbox. */
const FEET_Y: Record<CharacterId, number> = {fatima: 1136, ghozlan: 1133, dr_heba: 1156};

/**
 * Mouth anchor correction (sprite px). Overlay tests showed the pack anchors
 * for Fatima and Ghozlan land on the nose tip (~15 px high); these offsets move
 * them onto the painted lip line. Dr. Heba needed only a small nudge.
 */
const ANCHOR_CORRECTION: Record<CharacterId, [number, number]> = {
  fatima: [5.1, 14.8],
  ghozlan: [3.0, 14.9],
  dr_heba: [3.3, -2.8],
};
/** Mouth overlay size in sprite px (supplied sprite is 96×60; painted lips ≈ 33 px wide). */
const MOUTH_W = 48;
const MOUTH_H = 30;

export type CharacterProps = {
  who: CharacterId;
  /** World x of the body centre and y of the floor contact. */
  x: number;
  floorY: number;
  scale: number;
  mouthState?: number;
  /** Breathing phase input (frame) and amplitude (fraction of height, ≤ 0.015). */
  frame: number;
  breath?: number;
  /** Whole-body lean in degrees, pivoting at the feet. */
  lean?: number;
  /** Vertical lift in px (negative = up). */
  lift?: number;
  dx?: number;
  opacity?: number;
  shadow?: number;
  filter?: string;
};

export const Character: React.FC<CharacterProps> = ({
  who, x, floorY, scale, mouthState = 0, frame, breath = 0.01, lean = 0, lift = 0, dx = 0,
  opacity = 1, shadow = 0.2, filter,
}) => {
  const a = ANCHORS[who];
  const [w, h] = a.size_px;
  const feet = FEET_Y[who];
  const seed = {fatima: 0, ghozlan: 1.7, dr_heba: 3.1}[who];
  // ~4.3 s breathing cycle; scaleY anchored at the feet keeps floor contact.
  const breathe = 1 + breath * (0.5 + 0.5 * Math.sin((frame / 30) * 1.45 + seed));
  const sway = Math.sin((frame / 30) * 0.55 + seed) * 0.12; // degrees
  const [mx, my] = [a.mouth_anchor_px[0] + ANCHOR_CORRECTION[who][0], a.mouth_anchor_px[1] + ANCHOR_CORRECTION[who][1]];

  return (
    <div style={{position: 'absolute', left: x + dx, top: floorY, width: 0, height: 0, opacity}}>
      {/* contact shadow on the floor (not breathing) */}
      <div
        style={{
          position: 'absolute', left: (-w * scale * 0.42), top: -10 * scale, width: w * scale * 0.84, height: 26 * scale,
          borderRadius: '50%', background: `radial-gradient(closest-side, rgba(60,45,35,${shadow}), rgba(60,45,35,0))`,
        }}
      />
      <div
        style={{
          position: 'absolute', left: (-w / 2), top: -feet, width: w, height: h,
          transformOrigin: `${w / 2}px ${feet}px`,
          transform: `translateY(${lift}px) scale(${scale}) rotate(${lean + sway}deg) scaleY(${breathe})`,
          filter,
        }}
      >
        <Img src={staticFile(`derived/characters/${who}.png`)} style={{position: 'absolute', left: 0, top: 0, width: w, height: h}} />
        {mouthState > 0 ? (
          <Img
            src={staticFile(`derived/mouths/${who}_open_${mouthState}.png`)}
            style={{position: 'absolute', left: mx - MOUTH_W / 2, top: my - MOUTH_H / 2, width: MOUTH_W, height: MOUTH_H}}
          />
        ) : null}
      </div>
    </div>
  );
};
