import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {blocks} from '../data/timing';

/** Scene 7 — mint end card; narrator off-screen. Centre intentionally empty for later logos. */
export const Scene07EndCard: React.FC<{frame: number}> = ({frame: f}) => {
  const t = (f - blocks.endCard.start) / 30;
  const drift = 1.02 + 0.02 * Math.sin(t * 0.25);
  return (
    <AbsoluteFill style={{backgroundColor: 'rgb(170,226,212)', overflow: 'hidden'}}>
      <Img
        src={staticFile('backgrounds/end_card_mint_1080x1920.png')}
        style={{position: 'absolute', inset: 0, width: 1080, height: 1920, transform: `scale(${drift}) translate(${Math.sin(t * 0.2) * 6}px, ${Math.cos(t * 0.17) * 8}px)`}}
      />
      {/* slow light moving along the edges only */}
      <div style={{position: 'absolute', left: -260 + Math.sin(t * 0.3) * 60, top: -200 + t * 6, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.28), rgba(255,255,255,0))'}} />
      <div style={{position: 'absolute', right: -280 + Math.cos(t * 0.27) * 60, bottom: -240 + t * 5, width: 760, height: 760, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.24), rgba(255,255,255,0))'}} />
    </AbsoluteFill>
  );
};
