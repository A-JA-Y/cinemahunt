'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const END_STATE = {
  up: { opacity: 1, y: 0 },
  fade: { opacity: 1 },
  scale: { opacity: 1, scale: 1 },
  left: { opacity: 1, x: 0 },
  right: { opacity: 1, x: 0 },
  clip: { clipPath: 'inset(0 0 0% 0)' }
};

/**
 * Reveals its children once when they scroll into view.
 *
 * The hidden start state lives in globals.css under `.motion-ready`, not here, so
 * the element is already hidden at first paint rather than flashing in and out.
 *
 * @param {object} props
 * @param {'up'|'fade'|'scale'|'left'|'right'|'clip'} [props.variant]
 * @param {number} [props.delay]
 * @param {number} [props.duration]
 * @param {string} [props.stagger] Selector for children to stagger instead of the element itself.
 * @param {string} [props.start]   ScrollTrigger start, default 'top 85%'.
 * @param {'div'|'section'|'span'|'li'|'header'|'footer'|'article'} [props.as]
 */
export default function Reveal({
  children,
  variant = 'up',
  delay = 0,
  duration = 1.1,
  stagger,
  start = 'top 85%',
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const targets = stagger ? Array.from(el.querySelectorAll(stagger)) : [el];
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.to(targets, {
        ...END_STATE[variant],
        duration,
        delay,
        ease: 'expo.out',
        stagger: stagger ? 0.08 : 0,
        scrollTrigger: { trigger: el, start, once: true }
      });
    }, el);

    return () => ctx.revert();
  }, [variant, delay, duration, stagger, start]);

  // data-reveal is what the CSS hooks the hidden start state onto.
  const revealAttr = stagger ? undefined : variant;

  return (
    <Tag ref={ref} data-reveal={revealAttr} className={className} {...rest}>
      {children}
    </Tag>
  );
}
