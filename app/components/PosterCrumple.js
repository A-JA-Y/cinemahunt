'use client';

import { useState } from 'react';
import PaperCrumple from './reactbits/PaperCrumple';
import { texture } from '../lib/img';

/**
 * The poster as a physical object: hold to crumple it, drag it around, let go and
 * it keeps its creases. Deliberately the one toy on the page — a thing to fidget
 * with while deciding, rather than another panel to read.
 *
 * three.js samples the texture with crossOrigin='anonymous', so the poster has to
 * come through /api/img. Falls back to a plain <img> if WebGL is unavailable.
 */
export default function PosterCrumple({ poster, title }) {
  const [resetKey, setResetKey] = useState(0);
  const [state, setState] = useState('flat');
  const [failed, setFailed] = useState(false);

  if (!poster) return null;

  if (failed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={poster} alt={`${title} poster`} className="mx-auto w-full max-w-xs" />
    );
  }

  return (
    <div className="relative">
      <PaperCrumple
        src={texture(poster)}
        alt={`${title} poster`}
        width={300}
        height={444}
        sceneHeight={560}
        imageFit="cover"
        releaseBehavior="creased"
        creaseStrength={0.22}
        crumpleAmount={0.88}
        foldCount={7}
        foldSharpness={0.62}
        wrinkleDepth={0.7}
        paperColor="#15131a"
        roughness={0.9}
        paperTexture={0.1}
        lightIntensity={2}
        lightAngle={-32}
        shadow
        shadowOpacity={0.3}
        draggable
        dragRotation={12}
        returnToOrigin
        detail={64}
        resetKey={resetKey}
        onStateChange={setState}
        onError={() => setFailed(true)}
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="ch-tag">
          {state === 'holding' ? 'Keep holding · drag it' : state === 'creased' ? 'Creased' : 'Hold to crumple'}
        </p>
        {state === 'creased' && (
          <button type="button" onClick={() => setResetKey(k => k + 1)} className="ch-tag ch-link">
            Smooth it out
          </button>
        )}
      </div>
    </div>
  );
}
