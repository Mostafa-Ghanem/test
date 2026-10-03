import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Camera} from '../components/Camera';
import {LipSyncCharacter} from '../components/LipSyncCharacter';
import {lines, scenes} from '../data/timing';
import {Key, keyframes, ramp} from '../utils/easing';
import {scene2Camera} from './Scene02Clinic';
import {fatimaSurprise, hebaEntrance, scene3Camera} from './Scene03Doctor';
import {MethodIcons, scene4Camera} from './Scene04Methods';
import {FamilyVignette, scene5Camera} from './Scene05Family';

const CAMERA: Key<[number, number, number]>[] = [...scene2Camera, ...scene3Camera, ...scene4Camera, ...scene5Camera];
const track = (f: number, i: 0 | 1 | 2) => keyframes(f, CAMERA.map(([k, v]) => [k, v[i]] as Key<number>));

/** World layout shared by scenes 2–5: one continuous clinic set, fixed character scale and floor. */
const FLOOR = 1840;
const SCALE = 0.94;
// Ghozlan stands just in front of Fatima's right side: her arm covers the flat crop edge of Fatima's cutout.
const POS = {fatima: 255, ghozlan: 530, dr_heba: 850};

export const ClinicSet: React.FC<{frame: number}> = ({frame: f}) => {
  const cam = {cx: track(f, 0), cy: track(f, 1), zoom: track(f, 2)};
  const heba = hebaEntrance(f);
  const surprise = fatimaSurprise(f);
  // Fatima: vulnerable lean toward Ghozlan while reassured → upright, lifted posture as relief arrives (scene 5).
  const fatimaLean = keyframes(f, [[scenes.scene2.start, 0.25], [lines.L03.start + 30, 0.6], [lines.L04.start, 0.15], [lines.L05.start, 0]]) + surprise.lean;
  const relief = ramp(f, lines.L08.start + 30, lines.L09.start + 40);
  const ghozlanLean = keyframes(f, [[scenes.scene2.start, -0.45], [lines.L05.start, -0.1]]);
  const warm = 0.06 * relief;
  return (
    <AbsoluteFill style={{backgroundColor: 'rgb(217,241,235)'}}>
      <Camera cam={cam}>
        <Backdrop src="backgrounds/clinic_1080x1920.png" />
        {/* soft window light across the wall */}
        <div style={{position: 'absolute', left: -120, top: 120, width: 760, height: 900, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(255,255,245,${0.35 + 0.05 * Math.sin(f / 70)}), rgba(255,255,245,0))`}} />
        <MethodIcons frame={f} />
        <FamilyVignette frame={f} />
        {f >= scenes.scene3.start - 40 ? (
          <LipSyncCharacter who="dr_heba" x={POS.dr_heba} floorY={FLOOR} scale={SCALE} frame={f} dx={heba.dx} opacity={heba.opacity} />
        ) : null}
        <LipSyncCharacter who="fatima" x={POS.fatima} floorY={FLOOR + 6} scale={SCALE} frame={f} lean={fatimaLean} lift={surprise.lift - 4 * relief} />
        <LipSyncCharacter who="ghozlan" x={POS.ghozlan} floorY={FLOOR + 10} scale={SCALE} frame={f} lean={ghozlanLean} />
      </Camera>
      <AbsoluteFill style={{background: `rgba(255,200,150,${warm})`, mixBlendMode: 'soft-light'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 50%, rgba(0,0,0,0) 60%, rgba(30,70,65,0.12) 100%)'}} />
    </AbsoluteFill>
  );
};
