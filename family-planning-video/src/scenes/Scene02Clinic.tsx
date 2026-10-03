import {Key} from '../utils/easing';
import {beats, scenes} from '../data/timing';

/** Scene 2 — Ghozlan reassures Fatima. Near-locked two-shot with a tiny push-in. */
export const scene2Camera: Key<[number, number, number]>[] = [
  [scenes.scene2.start - 6, [428, 1120, 1.26]],
  [beats.hebaEnterStart, [430, 1108, 1.3]],
];
