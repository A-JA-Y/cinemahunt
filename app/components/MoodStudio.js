'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import Reveal from './motion/Reveal';
import SplitLines from './motion/SplitLines';
import { useStagePublisher } from './stage';

/**
 * Mood -> films, via Groq.
 *
 * The previous build had a five-option <select>. This asks three things instead,
 * because "sad" alone doesn't distinguish a slow melancholy film from a cathartic
 * one: a mood word, an energy level, and how much runtime you have.
 */

const MOODS = [
  { key: 'Restless', hint: 'cannot settle' },
  { key: 'Tender', hint: 'want to feel something' },
  { key: 'Wired', hint: 'need momentum' },
  { key: 'Hollow', hint: 'want company' },
  { key: 'Curious', hint: 'show me something new' },
  { key: 'Nostalgic', hint: 'take me back' },
  { key: 'Frayed', hint: 'nothing demanding' },
  { key: 'Reckless', hint: 'surprise me' }
];

const APPETITES = [
  { key: 'short', label: 'Under 100 min' },
  { key: 'any', label: 'Any length' },
  { key: 'long', label: 'Give me an epic' }
];

const ERAS = [
  { key: 'any', label: 'Any era' },
  { key: 'classic', label: 'Pre-1980' },
  { key: 'modern', label: '1980–2010' },
  { key: 'recent', label: '2010 onward' }
];

// Stable empty array: a fresh [] each render would churn the stage store.
const EMPTY = [];

export default function MoodStudio() {
  const [mood, setMood] = useState('Restless');
  const [energy, setEnergy] = useState(45);
  const [appetite, setAppetite] = useState('any');
  const [era, setEra] = useState('any');
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultsRef = useRef(null);

  useStagePublisher('mood', result?.picks ?? EMPTY);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, energy, appetite, era, note: note.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'The programmer is out. Try again.');
        setResult(null);
        return;
      }
      setResult(data);

      // Let the new rows paint, then bring them in.
      requestAnimationFrame(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        gsap.fromTo(
          resultsRef.current?.querySelectorAll('[data-pick]') ?? [],
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }
        );
      });
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="mood" className="relative scroll-mt-24 py-28 sm:py-40">
      <div className="ch-shell">
        <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
          <span className="ch-tag shrink-0">02 / Mood</span>
          <span className="ch-tag ml-auto">Groq · gpt-oss-120b</span>
        </div>

        <SplitLines
          as="h2"
          className="ch-display mt-10 max-w-[18ch]"
          lines={['Tell it how', 'you feel.']}
        />

        {/* Mood words ----------------------------------------------------- */}
        <Reveal variant="fade" className="mt-14">
          <p className="ch-tag mb-5">The feeling</p>
          <div className="flex flex-wrap gap-x-7 gap-y-4">
            {MOODS.map(option => {
              const on = mood === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMood(option.key)}
                  aria-pressed={on}
                  className="group/mood text-left"
                >
                  <span
                    className={`ch-title block !text-[clamp(1.35rem,2.6vw,2rem)] transition-colors duration-400 ${
                      on ? 'text-ember' : 'text-ash hover:text-bone'
                    }`}
                  >
                    {option.key}
                  </span>
                  <span
                    className={`ch-tag block transition-opacity duration-400 ${
                      on ? 'opacity-100' : 'opacity-0 group-hover/mood:opacity-60'
                    }`}
                  >
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Energy --------------------------------------------------------- */}
        <Reveal variant="fade" className="mt-16 max-w-xl">
          <div className="flex items-baseline justify-between">
            <label htmlFor="energy" className="ch-tag">
              Energy
            </label>
            <span className="ch-num text-fine text-ash">{energy}</span>
          </div>
          <input
            id="energy"
            type="range"
            min="0"
            max="100"
            step="5"
            value={energy}
            onChange={e => setEnergy(Number(e.target.value))}
            className="ch-range mt-4"
            style={{ '--ch-range-fill': `${energy}%` }}
          />
          <div className="ch-tag mt-2 flex justify-between">
            <span>Still</span>
            <span>Relentless</span>
          </div>
        </Reveal>

        {/* Runtime + era -------------------------------------------------- */}
        <Reveal variant="fade" className="mt-14 grid gap-10 sm:grid-cols-2">
          <ChoiceRow label="Runtime" options={APPETITES} value={appetite} onChange={setAppetite} />
          <ChoiceRow label="Era" options={ERAS} value={era} onChange={setEra} />
        </Reveal>

        {/* Free text ------------------------------------------------------ */}
        <Reveal variant="fade" className="mt-14 max-w-2xl">
          <label htmlFor="mood-note" className="ch-tag">
            Anything else (optional)
          </label>
          <input
            id="mood-note"
            value={note}
            maxLength={200}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="nothing with dogs dying, please"
            className="ch-field mt-2 !text-body"
          />
        </Reveal>

        <Reveal variant="fade" className="mt-12 flex flex-wrap items-center gap-6">
          <button type="button" onClick={submit} disabled={loading} className="ch-btn ch-btn--ember">
            {loading ? 'Programming…' : 'Find my film'}
          </button>
          {error && (
            <p role="alert" className="font-mono text-fine text-ember">
              {error}
            </p>
          )}
        </Reveal>

        {loading && <div className="ch-thinking mt-10" />}

        {/* Picks ---------------------------------------------------------- */}
        {result && (
          <div ref={resultsRef} className="mt-20">
            {result.read && (
              <p className="ch-lead mb-12 max-w-[42ch] border-l border-ember pl-6 italic">
                {result.read}
              </p>
            )}

            <ol>
              {result.picks.map((pick, index) => (
                <li key={pick.imdbId} data-pick className="border-t border-hairline">
                  <Link
                    href={`/movie/${pick.imdbId}`}
                    className="group/pick flex items-start gap-5 py-7 no-underline sm:gap-10"
                  >
                    <span className="ch-num w-9 shrink-0 pt-2 text-fine text-ash-dim">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {pick.poster && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={pick.poster}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="hidden h-28 w-[4.75rem] shrink-0 object-cover grayscale transition-[filter,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/pick:grayscale-0 group-hover/pick:scale-[1.04] sm:block"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="ch-title !text-[clamp(1.2rem,2.4vw,1.9rem)] transition-colors duration-500 group-hover/pick:text-ember">
                        {pick.title}
                        {pick.year && <span className="ch-num ml-3 text-fine text-ash">{pick.year}</span>}
                      </h3>
                      <p className="mt-2 max-w-[48ch] text-fine text-ash">{pick.because}</p>
                      <p className="ch-tag mt-3">
                        {[pick.genres?.slice(0, 2).join(' · '), pick.runtime, pick.imdbRating && `IMDb ${pick.imdbRating}`]
                          .filter(Boolean)
                          .join('  ·  ')}
                      </p>
                    </div>

                    <span
                      aria-hidden="true"
                      className="hidden shrink-0 self-center text-ash transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/pick:translate-x-2 group-hover/pick:text-ember sm:block"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

function ChoiceRow({ label, options, value, onChange }) {
  return (
    <div>
      <p className="ch-tag mb-4">{label}</p>
      <div className="flex flex-col gap-1">
        {options.map(option => {
          const on = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              aria-pressed={on}
              className="group/row flex items-center gap-3 py-1.5 text-left"
            >
              <span
                className={`h-px w-6 shrink-0 transition-[width,background] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  on ? 'w-10 bg-ember' : 'bg-ash-dim group-hover/row:w-8'
                }`}
              />
              <span
                className={`text-body transition-colors duration-400 ${
                  on ? 'text-bone' : 'text-ash group-hover/row:text-bone'
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
