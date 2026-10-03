import React from 'react';
import {MedicalIcon} from '../components/MedicalIcon';
import {iconCues, scenes} from '../data/timing';
import {Key} from '../utils/easing';

/** Scene 4 — Dr. Heba explains methods; very slow push toward her. */
export const scene4Camera: Key<[number, number, number]>[] = [
  [iconCues.breastfeeding, [560, 950, 1.04]],
  [scenes.scene4.end, [560, 950, 1.045]],
];

/** Icons in the upper wall area, clear of all faces (heads start ≈ y 765). No labels. */
export const MethodIcons: React.FC<{frame: number}> = ({frame}) => (
  <>
    <MedicalIcon kind="iud" x={420} y={300} size={200} frame={frame} cue={iconCues.iud} outAt={iconCues.allOut} />
    <MedicalIcon kind="pills" x={675} y={300} size={200} frame={frame} cue={iconCues.pills} outAt={iconCues.allOut} />
    <MedicalIcon kind="injection" x={930} y={300} size={200} frame={frame} cue={iconCues.injection} outAt={iconCues.allOut} />
    <MedicalIcon kind="implant" x={548} y={545} size={200} frame={frame} cue={iconCues.implant} outAt={iconCues.allOut} />
    <MedicalIcon kind="breastfeeding" x={810} y={555} size={232} frame={frame} cue={iconCues.breastfeeding} outAt={iconCues.allOut} />
  </>
);
