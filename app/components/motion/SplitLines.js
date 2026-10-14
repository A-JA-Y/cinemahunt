'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Masked line-by-line rise, the standard treatment for display headings here.
 *
 * Lines are passed in explicitly rather than measured from wrapped text: GSAP's
 * SplitText is a paid plugin, and hand-authored breaks give better typographic
 * control over where a headline turns than automatic measurement does.
 *
 * @param {object} props
 * @param {string[]} props.lines
 * @param {'h1'|'h2'|'h3'|'p'|'div'} [props.as]
 * @param {number} [props.delay]
 * @param {boolean} [props.onMount] Play immediately instead of on scroll (hero use).
 */
export default function SplitLines({
  lines,
  as: Tag = 'h2',
  delay = 0,
  onMount = false,
  className = '',
  lineClassName = '',
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const spans = el.querySelectorAll('.ch-line > span');
    if (!spans.length) return;

    const ctx = gsap.context(() => {
      gsap.to(spans, {
        y: '0%',
        duration: 1.25,
        delay,
        ease: 'expo.out',
        stagger: 0.09,
        ...(onMount ? {} : { scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
      });
    }, el);

    return () => ctx.revert();
  }, [delay, onMount, lines]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {lines.map((line, i) => (
        <span key={i} className={`ch-line ${lineClassName}`}>
          <span>{line}</span>
        </span>
      ))}
    </Tag>
  );
}
