# Render Report: Family Planning Explainer

## Output
| Item | Value |
|---|---|
| File | `out/family_planning_final_1080x1920.mp4` |
| Duration | Video 67.500 s (2025 frames); audio stream 67.520 s (AAC encoder padding); master WAV 67.474 s |
| Frames | 2025 (= `project_config.json` total_frames, ceil(67.47425 × 30)) |
| Resolution | 1080 × 1920 (9:16) |
| FPS | 30 (constant) |
| Video codec | H.264 High, yuv420p (BT.709, limited range), CRF 17, preset slow |
| Audio codec | AAC-LC 48 kHz, 256 kb/s (mono master on both channels) |
| Faststart | Yes (moov before mdat) |
| File size | 23,080,603 bytes (22.0 MiB) |
| Preview | `out/family_planning_preview.mp4`: 540×960, 2025 frames, 6.7 MB |
| QC sheet | `out/contact-sheet.png` (every 75th frame) |

## Scene timing (scene_plan.json → frames @ 30 fps)
| # | Scene | Start s | End s | Frames | Speakers | Treatment |
|---|---|---|---|---|---|---|
| 1 | Home / hook | 0.00 | 8.30 | 0–248 | Fatima | night plate, slow push-in, baby unrest, lamp glow |
| 2 | Clinic: Ghozlan + Fatima | 8.30 | 17.48 | 249–523 | Ghozlan, Fatima | two-shot, z 1.26→1.30 |
| 3 | Doctor enters | 17.48 | 25.40 | 524–761 | Dr. Heba, Fatima | pull-out reveal, Heba eased slide-in, surprise at 23.73 s |
| 4 | Methods | 25.40 | 39.96 | 762–1198 | Dr. Heba | icons at 30.0 / 34.3 / 35.5 / 36.3 / 37.8 s |
| 5 | Choice + spacing | 39.96 | 52.25 | 1199–1567 | Ghozlan, Fatima, Dr. Heba | speaker reframes, relief lift, family vignette from 47.9 s |
| 6 | Health unit exterior | 52.25 | 57.51 | 1568–1724 | Ghozlan | palm/plant breeze, cloud drift, z 1.02→1.07 |
| 7 | End card | 57.51 | 67.47 | 1725–2024 | Narrator (off-screen) | edge drift and light only; centre empty |

Transitions: 10-frame cross-dissolves at 249, 1568 and 1725, the only location changes. Scenes 2–5 are one continuous clinic set, so the plan's cuts there are camera reframes, with no dissolve and no jump in character scale.

## QC completed
- Audio: master WAV used directly at unity gain from frame 0. Cross-correlation of the output against the master gives a **0 ms offset** and correlation 0.99996 (the residual is AAC coding). Peak −4.1 dBFS, no clipping. No regenerated, stretched or added audio.
- ffprobe on both MP4s confirms video and audio streams, 1080×1920 / 540×960, 30/1, 2025 frames, yuv420p. A full decode of the final had no errors.
- `freezedetect` (1 s, n = 0.0005) found no frozen spans.
- Stills checked at 0, 120, 247, 300, 480, 520, 560, 580, 600, 715, 900, 1140, 1180, 1250, 1360, 1500, 1568, 1650, 1730, 1900 and 2024, covering the start, scene midpoints, all transitions, speaker changes and icon cues.
- Correct characters: Ghozlan has no cap. Same sprites in every scene.
- No subtitles or text. Icons have no labels. The end-card centre is empty.
- Mouths: only the CSV's active speaker opens; the others stay closed (`mouthFor`). The opening sits on the painted lips (checked by close crops).
- Icons appear in speech order and never cover a face (all are above y ≈ 650; heads start at about y 765).
- `tsc --noEmit` passes.

## Intentional deviations and limitations
1. **Mouth anchors corrected.** Overlay tests put the pack anchors for Fatima and Ghozlan on the nose tip, about 15 px too high. Offsets in `Character.tsx` (`ANCHOR_CORRECTION`) move them onto the lips.
2. **Mouth sprites trimmed.** The supplied 96×60 sprites are a flat skin-coloured oval with a grey halo, which covered the painted face. `scripts/derive_assets.py` keeps only each sprite's dark opening and tongue pixels. State 0 shows the original painted lips.
3. **Lip-sync smoothing.** 246 single-frame state blips were replaced by the lower neighbour state. Speech onset and offset frames are unchanged.
4. **Sprite cleanup.** Ghozlan's cutout contained a 4,904 px strip of Fatima's dress, and Fatima's contained 1,987 px of Ghozlan's blue sleeve. Both were removed (alpha only, no repainting).
5. **Fatima's cutout has her right elbow sliced flat.** It is hidden by composition rather than repainted. In the clinic and exterior scenes Ghozlan stands just in front of it. In Scene 1 the home background is **mirrored horizontally**, so Fatima stands right of the crib with that edge outside the frame.
6. **Seated poses.** The storyboards show seated or gesturing poses, but only standing sprites exist. All scenes use the standing sprites with storyboard order and placement. Gestures (hand on shoulder, hand to mouth) are suggested with whole-body lean or lift only, never by distorting limbs.
7. **No facial expression changes.** All sprites smile. Worry and relief are carried by lighting (night grade, warm lift in Scene 5), posture and camera.
8. **No blinks.** There are no isolated eye layers, so there are no blinks rather than bad ones.
9. **Style gap.** The supplied background plates are simple flat vector art, while the characters are painterly. The plates get a 1.2 px depth-of-field blur, soft light overlays and contact shadows so the characters read as the focal layer.
10. **Family vignette.** It is a feathered crop of the approved `05_family_vignette_reference.png` (no separate asset was supplied). It is silent.
11. **Icon timing.** It is based on pause detection inside L07, since the pack has no word-level alignment. Allow about ±0.3 s.
12. **No ambient audio or baby cry.** None was supplied and synthetic audio was ruled out, so the soundtrack is the master dialogue only.
13. **Colour conversion.** Remotion's JPEG frame path produced full-range `yuvj420p`. A final ffmpeg pass converts to limited-range `yuv420p` BT.709 at CRF 17 and copies the audio stream unchanged.

## Rebuild
```
npm install
./scripts/render-all.sh        # derive → data → bundle → preview + final
npm run studio                  # interactive editing
```
Uses Chromium at `/opt/pw-browsers/...` (override with env `REMOTION_BROWSER`).
