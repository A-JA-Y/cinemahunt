'use client';

import { useState } from 'react';
import Reveal from './motion/Reveal';
import SplitLines from './motion/SplitLines';

/**
 * Spoiler-free orientation: the hook, the setup, the themes, and an honest read on
 * who will bounce off it. The official plot sits behind a toggle, because it's the
 * one block on the page that does give things away.
 *
 * @param {{ synopsis: object|null, loading: boolean, error: string|null, officialPlot: string|null }} props
 */
export default function AiSynopsis({ synopsis, loading, error, officialPlot }) {
  const [showPlot, setShowPlot] = useState(false);

  return (
    <section id="synopsis" className="ch-shell scroll-mt-24 py-24 sm:py-32">
      <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
        <span className="ch-tag shrink-0">Synopsis</span>
        <span className="ch-tag ml-auto">Spoiler-free</span>
      </div>

      {loading && (
        <>
          <p className="ch-lead mt-10 text-ash">Writing it up…</p>
          <div className="ch-thinking mt-6 max-w-sm" />
        </>
      )}

      {error && (
        <p role="alert" className="mt-10 font-mono text-fine text-ember">
          {error}
        </p>
      )}

      {synopsis && !loading && (
        <>
          {synopsis.hook && (
            <SplitLines
              as="p"
              className="ch-display mt-10 max-w-[26ch] !text-[clamp(1.6rem,3.8vw,3rem)]"
              lines={wrapToLines(synopsis.hook, 26)}
            />
          )}

          <div className="mt-16 grid gap-x-16 gap-y-14 lg:grid-cols-[1.35fr_1fr]">
            {/* Premise + craft ------------------------------------------- */}
            <div>
              <Reveal variant="up">
                <p className="ch-tag">The setup</p>
                <p className="ch-lead mt-4 max-w-[54ch]">{synopsis.premise}</p>
              </Reveal>

              {synopsis.craft && (
                <Reveal variant="up" delay={0.1} className="mt-12">
                  <p className="ch-tag">On the craft</p>
                  <p className="mt-4 max-w-[54ch] text-body text-ash">{synopsis.craft}</p>
                </Reveal>
              )}

              {officialPlot && (
                <Reveal variant="fade" delay={0.15} className="mt-12">
                  <button
                    type="button"
                    onClick={() => setShowPlot(v => !v)}
                    aria-expanded={showPlot}
                    className="ch-tag ch-link"
                  >
                    {showPlot ? '− Hide' : '+ Show'} the official plot (spoilers)
                  </button>
                  {showPlot && (
                    <p className="ch-swap mt-5 max-w-[54ch] text-fine leading-relaxed text-ash">
                      {officialPlot}
                    </p>
                  )}
                </Reveal>
              )}
            </div>

            {/* Themes + fit ---------------------------------------------- */}
            <div>
              {synopsis.themes?.length > 0 && (
                <Reveal variant="up" stagger="[data-theme]">
                  <p className="ch-tag mb-5">Running through it</p>
                  <dl>
                    {synopsis.themes.map(theme => (
                      <div key={theme.label} data-theme className="border-t border-hairline py-4">
                        <dt className="ch-title !text-[clamp(1.05rem,1.8vw,1.35rem)]">
                          {theme.label}
                        </dt>
                        <dd className="mt-1 text-fine text-ash">{theme.note}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              )}

              {synopsis.forYouIf?.length > 0 && (
                <Reveal variant="up" delay={0.1} className="mt-12">
                  <p className="ch-tag mb-4 text-ice">Watch it if</p>
                  <ul className="space-y-2.5">
                    {synopsis.forYouIf.map(item => (
                      <li key={item} className="flex gap-3 text-body">
                        <span aria-hidden="true" className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-ice" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}

              {synopsis.skipIf?.length > 0 && (
                <Reveal variant="up" delay={0.15} className="mt-10">
                  <p className="ch-tag mb-4 text-ember">Skip it if</p>
                  <ul className="space-y-2.5">
                    {synopsis.skipIf.map(item => (
                      <li key={item} className="flex gap-3 text-body text-ash">
                        <span aria-hidden="true" className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-ember" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
            </div>
          </div>

          {/* Comparables ------------------------------------------------- */}
          {synopsis.comparables?.length > 0 && (
            <Reveal variant="up" stagger="[data-comp]" className="mt-20">
              <p className="ch-tag mb-6">If you liked</p>
              <ul className="grid gap-x-12 gap-y-6 sm:grid-cols-3">
                {synopsis.comparables.map(comp => (
                  <li key={`${comp.title}-${comp.year}`} data-comp className="border-t border-hairline pt-4">
                    <p className="ch-title !text-[clamp(1.05rem,1.9vw,1.4rem)]">
                      {comp.title}
                      {comp.year && <span className="ch-num ml-2 text-fine text-ash">{comp.year}</span>}
                    </p>
                    <p className="mt-1.5 text-fine text-ash">{comp.why}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Break a sentence into display lines on word boundaries. SplitLines needs explicit
 * lines, and an AI-written hook has no authored break points.
 */
function wrapToLines(sentence, perLine) {
  const words = sentence.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > perLine) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
