import React from 'react';
import {AbsoluteFill, Audio, interpolate, useCurrentFrame} from 'remotion';
import {blocks, DISSOLVE} from './data/timing';
import {MASTER_AUDIO} from './utils/audio';
import {ClinicSet} from './scenes/ClinicSet';
import {Scene01Home} from './scenes/Scene01Home';
import {Scene06Exterior} from './scenes/Scene06Exterior';
import {Scene07EndCard} from './scenes/Scene07EndCard';

const H = DISSOLVE / 2;

/** Mounts a location block in [start-H, end+H) and dissolves it in over the boundary. */
const Slot: React.FC<{frame: number; start: number; end: number; first?: boolean; children: React.ReactNode}> = ({frame, start, end, first, children}) => {
  const from = first ? start : start - H;
  if (frame < from || frame >= end + H) return null;
  const opacity = first ? 1 : interpolate(frame, [start - H, start + H], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Slot frame={f} {...blocks.home} first><Scene01Home frame={f} /></Slot>
      <Slot frame={f} {...blocks.clinic}><ClinicSet frame={f} /></Slot>
      <Slot frame={f} {...blocks.exterior}><Scene06Exterior frame={f} /></Slot>
      <Slot frame={f} {...blocks.endCard}><Scene07EndCard frame={f} /></Slot>
      {/* Immutable master voice, from frame 0, unity gain. No music or synthetic audio. */}
      <Audio src={MASTER_AUDIO} />
    </AbsoluteFill>
  );
};
