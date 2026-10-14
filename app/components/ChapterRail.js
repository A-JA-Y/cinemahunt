'use client';

import { useEffect, useState } from 'react';
import { useLenis } from './motion/SmoothScroll';

/**
 * Fixed side rail marking where you are in a long page. Labels stay hidden until
 * hover so the rail reads as four quiet ticks rather than a second navigation bar.
 *
 * @param {{ chapters: Array<[string, string]> }} props  [elementId, label] pairs
 */
export default function ChapterRail({ chapters }) {
  const [active, setActive] = useState(chapters[0]?.[0]);
  const lenis = useLenis();

  useEffect(() => {
    // The band across the upper-middle of the viewport decides what's "current":
    // a plain top-edge test flickers between neighbours on a fast scroll.
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] }
    );

    // Some sections mount late — the trailer reel renders nothing until TMDB
    // answers — so binding once on mount would silently skip them. Re-check as
    // the DOM changes and pick up each section the first time it appears.
    const bound = new Set();
    const bind = () => {
      for (const [id] of chapters) {
        if (bound.has(id)) continue;
        const el = document.getElementById(id);
        if (el) {
          observer.observe(el);
          bound.add(id);
        }
      }
    };

    bind();

    const mutations = new MutationObserver(bind);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, [chapters]);

  const go = id => {
    const target = document.getElementById(id);
    if (!target) return;
    // Lenis owns the scroll position; window.scrollTo would fight its loop.
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.1 });
    else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Sections"
      className="fixed right-5 top-1/2 z-[72] hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex"
    >
      {chapters.map(([id, label]) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            aria-current={on ? 'true' : undefined}
            className="group/ch flex items-center gap-3"
          >
            <span
              className={`ch-tag whitespace-nowrap transition-opacity duration-400 ${
                on ? 'opacity-100' : 'opacity-0 group-hover/ch:opacity-70'
              }`}
            >
              {label}
            </span>
            <span
              className={`block h-px transition-[width,background] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                on ? 'w-7 bg-ember' : 'w-3.5 bg-ash-dim group-hover/ch:w-5 group-hover/ch:bg-bone'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
