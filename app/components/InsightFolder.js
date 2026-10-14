'use client';

import { useMemo } from 'react';
import FolderFloat from './reactbits/FolderFloat';

/**
 * The AI's short notes, kept in a folder that physically spills them out when you
 * open it (matter-js). The long-form analysis lives in the sections above; this is
 * the pocket version — the handful of lines worth carrying away.
 *
 * @param {{ vibe: object|null, synopsis: object|null, availability?: object|null }} props
 */
export default function InsightFolder({ vibe, synopsis, movie }) {
  const notes = useMemo(() => {
    const out = [];

    if (vibe?.oneLine) out.push(vibe.oneLine);
    if (vibe?.pairing) out.push(`Pairs with ${vibe.pairing}`);

    // Name the strongest register — the single most useful number on the page.
    const peak = vibe?.axes?.slice().sort((a, b) => b.value - a.value)[0];
    if (peak) out.push(`${peak.label} ${peak.value}/100`);

    if (synopsis?.themes?.length) out.push(...synopsis.themes.map(t => t.label));
    if (synopsis?.forYouIf?.length) out.push(synopsis.forYouIf[0]);
    if (synopsis?.skipIf?.length) out.push(synopsis.skipIf[0]);
    if (movie?.runtime) out.push(movie.runtime);

    // Over about eight pills the physics bodies start fighting for the same space.
    return out.filter(Boolean).slice(0, 8);
  }, [vibe, synopsis, movie]);

  if (notes.length < 3) return null;

  return (
    <div className="flex flex-col items-center">
      <FolderFloat
        items={notes}
        label="The short version"
        sublabel={`${notes.length} notes`}
        trigger="hover"
        closeOnSelect={false}
        physics
        drift={0.55}
        folderColor="#17151c"
        frontColor="#221f29"
        paperColor="#f5f2ea"
        itemColor="#f5f2ea"
        itemTextColor="#07070a"
        labelColor="#f5f2ea"
        width={210}
        height={150}
        radius={6}
        spread={190}
        lift={28}
        tilt={9}
        flapAngle={36}
        restAngle={16}
        openDuration={540}
        stagger={46}
        bounce={0.32}
      />
      <p className="ch-tag mt-3">Open it · the notes are draggable</p>
    </div>
  );
}
