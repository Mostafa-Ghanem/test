#!/usr/bin/env bash
# Full reproducible pipeline: derive layers → data → bundle → preview + final → yuv420p/faststart.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/derive_assets.py
node scripts/build-data.mjs
npx remotion bundle --out-dir=build
npx remotion render build Film out/raw_preview.mp4 --scale=0.5 --crf=23
npx remotion render build Film out/raw_final.mp4 --crf=18 --audio-codec=aac --audio-bitrate=256k
# Remotion's JPEG frame path yields full-range yuvj420p; convert to broadcast-range yuv420p.
fin() { ffmpeg -y -loglevel error -i "$1" -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf "$3" \
  -profile:v high -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart "$2"; rm "$1"; }
fin out/raw_preview.mp4 out/family_planning_preview.mp4 23
fin out/raw_final.mp4 out/family_planning_final_1080x1920.mp4 17
