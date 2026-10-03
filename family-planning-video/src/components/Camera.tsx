import React from 'react';
import {HEIGHT, WIDTH} from '../data/timing';

export type CameraState = {cx: number; cy: number; zoom: number};

/** Keep the frame inside the 1080×1920 world so no background edge is revealed. */
export const clampCamera = ({cx, cy, zoom}: CameraState): CameraState => {
  const z = Math.max(1, zoom);
  const hw = WIDTH / (2 * z);
  const hh = HEIGHT / (2 * z);
  return {zoom: z, cx: Math.min(WIDTH - hw, Math.max(hw, cx)), cy: Math.min(HEIGHT - hh, Math.max(hh, cy))};
};

export const Camera: React.FC<{cam: CameraState; children: React.ReactNode}> = ({cam, children}) => {
  const {cx, cy, zoom} = clampCamera(cam);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: WIDTH, height: HEIGHT, transformOrigin: '0 0',
          transform: `translate(${WIDTH / 2 - cx * zoom}px, ${HEIGHT / 2 - cy * zoom}px) scale(${zoom})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
