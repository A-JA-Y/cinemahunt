'use client';

import { useRef } from 'react';
import gsap from 'gsap';

/** Heart toggle. Pops on like, with a ring that expands and fades. */
export default function LikeButton({ liked, disabled, onToggle, title, className = '' }) {
  const ref = useRef(null);
  const ringRef = useRef(null);

  const handle = event => {
    event.preventDefault();
    event.stopPropagation();

    if (!disabled && !liked && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(ref.current, { scale: 1 }, { scale: 1.45, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
      gsap.fromTo(
        ringRef.current,
        { scale: 0.4, opacity: 0.9 },
        { scale: 2.2, opacity: 0, duration: 0.6, ease: 'expo.out' }
      );
    }
    onToggle?.();
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${title} from your list` : `Keep ${title}`}
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-opacity duration-300 disabled:opacity-25 ${className}`}
    >
      <span
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border border-ember opacity-0"
      />
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        className={`h-5 w-5 transition-colors duration-300 ${
          liked ? 'fill-ember text-ember' : 'fill-none text-ash hover:text-bone'
        }`}
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
        />
      </svg>
    </button>
  );
}
