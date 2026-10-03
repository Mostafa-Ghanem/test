import {Key, keyframes, ramp, easeOut} from '../utils/easing';
import {beats, lines, scenes} from '../data/timing';

/** Scene 3 — camera eases out to reveal Dr. Heba stepping in; small emphasis on Fatima's surprise. */
export const scene3Camera: Key<[number, number, number]>[] = [
  [beats.hebaEnterEnd + 20, [540, 960, 1.0]],
  [lines.L06.start - 10, [552, 972, 1.04]],
  [lines.L06.start + 14, [505, 990, 1.075]],
  [scenes.scene4.start + 30, [540, 960, 1.0]],
];

/** Heba's controlled entrance: short eased slide from the right + fade. */
export const hebaEntrance = (f: number) => {
  const t = ramp(f, beats.hebaEnterStart, beats.hebaEnterEnd, easeOut);
  return {dx: (1 - t) * 150, opacity: t};
};

/** Fatima's restrained surprise at "قبل الدورة؟!" — small lift and lean back, then settle. */
export const fatimaSurprise = (f: number) => {
  const s = beats.fatimaSurprise;
  return {
    lift: keyframes(f, [[s - 4, 0], [s + 5, -10], [s + 40, -4], [s + 80, -2]]),
    lean: keyframes(f, [[s - 4, 0], [s + 5, -0.9], [s + 40, -0.35], [s + 80, -0.15]]),
  };
};
