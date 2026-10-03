import {MOUTH, RAW_MOUTH, SPEAKER, SPEAKER_NAMES} from './lipSync.generated';

export type CharacterId = 'fatima' | 'ghozlan' | 'dr_heba';

const clampFrame = (f: number) => Math.max(0, Math.min(MOUTH.length - 1, Math.floor(f)));

export const speakerAt = (f: number) => SPEAKER_NAMES[Number(SPEAKER[clampFrame(f)])];

/** Mouth state (0–3) for a character: only the CSV's active speaker opens their mouth. */
export const mouthFor = (who: CharacterId, f: number): number =>
  speakerAt(f) === who ? Number(MOUTH[clampFrame(f)]) : 0;

export const rawMouthAt = (f: number) => Number(RAW_MOUTH[clampFrame(f)]);

/** 0–1 "is speaking" envelope with soft attack/release (for posture emphasis). */
export const speakingEnvelope = (who: CharacterId, f: number, attack = 8, release = 12) => {
  let v = 0;
  for (let d = -release; d <= attack; d++) {
    if (speakerAt(f + d) === who) {
      const w = d < 0 ? 1 - -d / (release + 1) : 1 - d / (attack + 1);
      v = Math.max(v, w);
    }
  }
  return v * v * (3 - 2 * v);
};
