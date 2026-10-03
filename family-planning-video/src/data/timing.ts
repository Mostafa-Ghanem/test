import {PROJECT_CONFIG, SCENE_PLAN, TRANSCRIPT} from './pack.generated';

export const FPS = PROJECT_CONFIG.fps; // 30
export const WIDTH = 1080;
export const HEIGHT = 1920;
/** 67.47425 s × 30 = 2024.2 → 2025 frames (pack project_config total_frames). */
export const TOTAL_FRAMES = PROJECT_CONFIG.total_frames;

export const sec = (s: number) => Math.round(s * FPS);

/** Scene boundaries straight from scene_plan.json, converted to frames. */
export const scenes = Object.fromEntries(
  SCENE_PLAN.map((s) => {
    const start = sec(s.start);
    const end = s.scene === 7 ? TOTAL_FRAMES : sec(s.end);
    return [`scene${s.scene}`, {start, end, duration: end - start}];
  }),
) as Record<'scene1' | 'scene2' | 'scene3' | 'scene4' | 'scene5' | 'scene6' | 'scene7', {start: number; end: number; duration: number}>;

/** Dialogue lines in frames (from transcript.json). */
export const lines = Object.fromEntries(
  TRANSCRIPT.map((l) => [l.id, {start: sec(l.start), end: sec(l.end), speaker: l.speaker}]),
) as Record<string, {start: number; end: number; speaker: string}>;

/** Cross-dissolve length at location changes (frames). */
export const DISSOLVE = 10;

/**
 * Location blocks. Scenes 2–5 share one continuous clinic set; the scene_plan
 * cuts inside it are realised as camera reframes, not dissolves.
 */
export const blocks = {
  home: {start: 0, end: scenes.scene1.end},
  clinic: {start: scenes.scene2.start, end: scenes.scene5.end},
  exterior: {start: scenes.scene6.start, end: scenes.scene6.end},
  endCard: {start: scenes.scene7.start, end: TOTAL_FRAMES},
};

/**
 * Icon cues inside L07 (25.408–39.663 s). The pack has no word-level
 * alignment, so cues sit on the onset after the pauses detected in
 * lip_sync_30fps.csv (level < 0.05 runs), matched to the script order:
 * "…في اللولب" / "وفي حبوب الرضاعة" / "والحقنة" / "والكبسولة تحت الجلد" / "وكلهم آمنين على الرضاعة".
 */
export const iconCues = {
  iud: sec(30.0), // pause 29.53–30.00 → "في اللولب"
  pills: sec(34.3), // pause 33.97–34.23 → "وفي حبوب الرضاعة"
  injection: sec(35.5), // pause 35.40–35.50 → "والحقنة"
  implant: sec(36.3), // pause 36.17–36.30 → "والكبسولة تحت الجلد"
  breastfeeding: sec(37.8), // pause 37.50–37.80 → "وكلهم آمنين على الرضاعة"
  allOut: scenes.scene4.end - 14,
};

/** Story beats (frames). */
export const beats = {
  hebaEnterStart: lines.L05.start - 28,
  hebaEnterEnd: lines.L05.start + 6,
  fatimaSurprise: lines.L06.start,
  vignetteIn: lines.L10.start + 6,
  vignetteOut: scenes.scene5.end - 8,
};
