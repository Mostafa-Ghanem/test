import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {BgPiece} from '../components/BgPiece';
import {Camera} from '../components/Camera';
import {LipSyncCharacter} from '../components/LipSyncCharacter';
import {blocks, lines} from '../data/timing';
import {keyframes, ramp} from '../utils/easing';

const BG = 'backgrounds/home_night_1080x1920.png';
const WALL = 'rgb(54,74,80)';

/** Scene 1 — night home. Fatima beside the crib; slow push-in; restrained crying-baby motion. */
export const Scene01Home: React.FC<{frame: number}> = ({frame: f}) => {
  const {start, end} = blocks.home;
  const cam = {
    cx: keyframes(f, [[start, 540], [end + 6, 585]]),
    cy: keyframes(f, [[start, 960], [end + 6, 1010]]),
    zoom: keyframes(f, [[start, 1.0], [end + 6, 1.09]]),
  };
  // baby unrest: strongest before Fatima speaks and in the pause between L01/L02, never large
  const cry = 0.35 + 0.65 * (1 - ramp(f, lines.L01.start - 6, lines.L01.start + 20)) + 0.5 * (ramp(f, lines.L01.end - 2, lines.L01.end + 4) - ramp(f, lines.L02.start - 4, lines.L02.start + 6));
  const babyScale = 1 + 0.022 * cry * Math.abs(Math.sin(f * 0.21)) ;
  const babyRot = 0.5 * cry * Math.sin(f * 0.29);
  const starGlow = 0.18 + 0.14 * (0.5 + 0.5 * Math.sin(f / 30 * 1.3));
  const curtain = 1 + 0.012 * (0.5 + 0.5 * Math.sin(f / 30 * 0.7));
  const lampGlow = 0.55 + 0.06 * Math.sin(f / 30 * 0.9);
  // worried: slow lean toward the crib, settles back a little while speaking
  const lean = -keyframes(f, [[0, 0], [28, 0.7], [150, 0.35], [175, 0.8], [end, 0.6]]);
  return (
    <AbsoluteFill style={{backgroundColor: WALL}}>
      <Camera cam={cam}>
        {/* Plate mirrored so Fatima can stand right of the crib with her cutout's cropped elbow edge outside frame. */}
        <div style={{position: 'absolute', inset: 0, transform: 'scaleX(-1)'}}>
        <Backdrop src={BG}>
          {/* right curtain breathes very slightly (scale ≥ 1 from its outer edge so the plate never ghosts) */}
          <BgPiece src={BG} box={[330, 110, 130, 650]} origin={[126, 0]} transform={`scaleX(${curtain})`} />
          {/* baby: small restrained unrest, scale ≥ 1 about the blanket base */}
          <BgPiece src={BG} box={[700, 1160, 230, 225]} origin={[115, 220]} transform={`rotate(${babyRot}deg) scale(${babyScale})`} />
          {/* mobile star twinkle */}
          <div style={{position: 'absolute', left: 70, top: 1010, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(255,236,170,${starGlow}), rgba(255,236,170,0))`}} />
        </Backdrop>
        </div>
        {/* warm lamp atmosphere */}
        <div style={{position: 'absolute', left: -80, top: 380, width: 600, height: 700, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(255,214,150,${lampGlow * 0.55}), rgba(255,200,130,0))`, mixBlendMode: 'screen'}} />
        <LipSyncCharacter who="fatima" x={952} floorY={1835} scale={0.95} frame={f} lean={lean} breath={0.012} />
      </Camera>
      {/* night grade + vignette (keeps Fatima readable) */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 60% 55%, rgba(20,30,55,0) 40%, rgba(15,22,40,0.45) 100%)'}} />
      <AbsoluteFill style={{background: 'rgba(40,60,110,0.10)', mixBlendMode: 'multiply'}} />
    </AbsoluteFill>
  );
};
