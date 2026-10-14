'use client';

import { useToasts } from './toast';

/** Mounted once in the root layout. Announced politely, never focus-stealing. */
export default function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map(item => (
        <p
          key={item.id}
          className={`ch-toast font-mono text-fine tracking-wide ${
            item.tone === 'ember' ? 'text-ember' : 'text-bone'
          }`}
        >
          {item.message}
        </p>
      ))}
    </div>
  );
}
