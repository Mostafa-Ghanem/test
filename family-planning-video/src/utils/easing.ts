import {Easing, interpolate} from 'remotion';

export const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** Ramp 0→1 between frames a and b with ease-in-out, clamped. */
export const ramp = (f: number, a: number, b: number, easing = easeInOut) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export type Key<T> = [frame: number, value: T];

/** Piecewise eased interpolation between numeric keyframes (holds outside range). */
export const keyframes = (f: number, keys: Key<number>[], easing = easeInOut) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (f <= f1) return v0 + (v1 - v0) * easing((f - f0) / Math.max(1, f1 - f0));
  }
  return keys[keys.length - 1][1];
};

/** Smooth deterministic wobble (sum of sines) in [-1, 1]. */
export const wobble = (f: number, seed: number, speed = 1) =>
  (Math.sin(f * 0.031 * speed + seed) * 0.6 + Math.sin(f * 0.017 * speed + seed * 2.3) * 0.4);
