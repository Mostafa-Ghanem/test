import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {BgPiece} from '../components/BgPiece';
import {Camera} from '../components/Camera';
import {LipSyncCharacter} from '../components/LipSyncCharacter';
import {blocks} from '../data/timing';
import {keyframes} from '../utils/easing';

const BG = 'backgrounds/health_unit_exterior_1080x1920.png';

/** Scene 6 — daylight exterior; all three together, Ghozlan addresses the viewer. Extremely slow push-in. */
export const Scene06Exterior: React.FC<{frame: number}> = ({frame: f}) => {
  const {start, end} = blocks.exterior;
  const cam = {
    cx: 540,
    cy: keyframes(f, [[start - 6, 990], [end + 6, 1010]]),
    zoom: keyframes(f, [[start - 6, 1.02], [end + 6, 1.07]]),
  };
  const breeze = Math.sin(f / 30 * 1.2) * 1.6 + Math.sin(f / 30 * 2.3) * 0.5;
  const cloud = (f - start) * 0.25;
  return (
    <AbsoluteFill style={{backgroundColor: 'rgb(164,216,244)'}}>
      <Camera cam={cam}>
        <Backdrop src={BG}>
          {/* palm fronds sway on a sky-coloured backing */}
          <BgPiece src={BG} box={[66, 150, 140, 125]} origin={[30, 110]} transform={`rotate(${breeze}deg)`} backing="rgb(164,216,244)" />
          {/* potted plants: tiny breeze (scale ≥ 1 about the pot rim) */}
          <BgPiece src={BG} box={[60, 1330, 150, 150]} origin={[75, 145]} transform={`rotate(${breeze * 0.5}deg) scale(1.01)`} />
          <BgPiece src={BG} box={[880, 1330, 150, 150]} origin={[75, 145]} transform={`rotate(${-breeze * 0.5}deg) scale(1.01)`} />
        </Backdrop>
        {/* soft drifting clouds in the open sky band above the building */}
        <div style={{position: 'absolute', left: 560 + cloud, top: 120, width: 260, height: 70, borderRadius: 50, background: 'rgba(255,255,255,0.55)', filter: 'blur(6px)'}} />
        <div style={{position: 'absolute', left: 250 + cloud * 0.6, top: 60, width: 180, height: 50, borderRadius: 40, background: 'rgba(255,255,255,0.45)', filter: 'blur(6px)'}} />
        <LipSyncCharacter who="fatima" x={250} floorY={1858} scale={0.95} frame={f} />
        <LipSyncCharacter who="dr_heba" x={828} floorY={1858} scale={0.95} frame={f} />
        <LipSyncCharacter who="ghozlan" x={528} floorY={1866} scale={0.95} frame={f} />
      </Camera>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(255,250,235,0.10), rgba(255,250,235,0) 40%)'}} />
    </AbsoluteFill>
  );
};
