import React from 'react';
import {Img, staticFile} from 'remotion';

/**
 * Supplied flat background plate. A very light blur gives the flat vector plate
 * depth-of-field so the painted character sprites read as the focal layer.
 */
export const Backdrop: React.FC<{src: string; blur?: number; children?: React.ReactNode}> = ({src, blur = 1.2, children}) => (
  <div style={{position: 'absolute', inset: 0, filter: blur ? `blur(${blur}px)` : undefined}}>
    <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}} />
    {children}
  </div>
);
