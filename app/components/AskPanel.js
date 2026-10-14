'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * Ask anything about this film. The answer carries its own spoiler rating, and
 * anything above "none" stays blurred until you choose to read it — the whole page
 * is otherwise spoiler-free and one careless answer would undo that.
 */

const STARTERS = [
  'Is it scary?',
  'Can I watch this with my parents?',
  'Does it hold up?',
  'Do I need to see the first one?'
];

export default function AskPanel({ movie }) {
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const threadRef = useRef(null);

  const ask = async value => {
    const asked = (value ?? question).trim();
    if (!asked || busy) return;

    setBusy(true);
    setError(null);
    setQuestion('');

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: movie.title,
          year: movie.year,
          plot: movie.plot,
          genres: movie.genres,
          director: movie.director,
          actors: movie.actors,
          question: asked
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No answer came back.');
        return;
      }

      setThread(prev => [...prev, { question: asked, ...data, revealed: data.spoilerRisk === 'none' }]);

      requestAnimationFrame(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rows = threadRef.current?.querySelectorAll('[data-turn]');
        const last = rows?.[rows.length - 1];
        if (last) gsap.fromTo(last, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
      });
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const reveal = index =>
    setThread(prev => prev.map((turn, i) => (i === index ? { ...turn, revealed: true } : turn)));

  return (
    <section id="ask" className="ch-shell scroll-mt-24 py-24 sm:py-32">
      <div className="flex items-baseline gap-4 border-t border-hairline pt-6">
        <span className="ch-tag shrink-0">Ask</span>
        <span className="ch-tag ml-auto">Groq</span>
      </div>

      <h2 className="ch-display mt-10 max-w-[20ch] !text-[clamp(1.6rem,3.6vw,2.75rem)]">
        Anything you need to know first?
      </h2>

      <form
        className="mt-10 max-w-3xl"
        onSubmit={e => {
          e.preventDefault();
          ask();
        }}
      >
        <label htmlFor="ask-input" className="ch-sr">
          Your question about {movie.title}
        </label>
        <div className="flex items-end gap-4">
          <input
            id="ask-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={400}
            placeholder={`Ask about ${movie.title}…`}
            className="ch-field flex-1"
          />
          <button type="submit" disabled={busy || !question.trim()} className="ch-btn ch-btn--ember shrink-0">
            {busy ? '…' : 'Ask'}
          </button>
        </div>
        <div className="mt-1 h-px">{busy && <div className="ch-thinking" />}</div>
      </form>

      {/* Starters ------------------------------------------------------- */}
      {thread.length === 0 && (
        <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
          {STARTERS.map(starter => (
            <button
              key={starter}
              type="button"
              disabled={busy}
              onClick={() => ask(starter)}
              className="ch-link text-fine text-ash transition-colors duration-300 hover:text-bone"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-8 font-mono text-fine text-ember">
          {error}
        </p>
      )}

      {/* Thread --------------------------------------------------------- */}
      {thread.length > 0 && (
        <div ref={threadRef} className="mt-14 max-w-3xl">
          {thread.map((turn, index) => (
            <article key={index} data-turn className="border-t border-hairline py-8">
              <p className="ch-title !text-[clamp(1.05rem,2vw,1.4rem)]">{turn.question}</p>

              {turn.revealed ? (
                <p className="ch-lead mt-4">{turn.answer}</p>
              ) : (
                <div className="mt-4">
                  <p className="ch-lead select-none blur-[7px]" aria-hidden="true">
                    {turn.answer}
                  </p>
                  <button
                    type="button"
                    onClick={() => reveal(index)}
                    className="ch-btn ch-btn--ghost mt-5 !py-2 !text-micro"
                  >
                    Reveal — {turn.spoilerRisk} spoilers
                  </button>
                </div>
              )}

              {turn.followUps?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                  {turn.followUps.map(followUp => (
                    <button
                      key={followUp}
                      type="button"
                      disabled={busy}
                      onClick={() => ask(followUp)}
                      className="ch-link text-fine text-ash transition-colors duration-300 hover:text-ember"
                    >
                      {followUp} →
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
