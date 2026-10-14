'use client';

import { useEffect, useState } from 'react';

// Tiny module-level toast store. Replaces the alert() calls the previous build used
// for like/error feedback — a modal dialog is a hard stop in the middle of a
// scroll-driven page.

let items = [];
const listeners = new Set();
let nextId = 1;

function emit() {
  for (const listener of listeners) listener(items);
}

/**
 * @param {string} message
 * @param {{ tone?: 'neutral'|'ember', ttl?: number }} [options]
 */
export function toast(message, { tone = 'neutral', ttl = 3200 } = {}) {
  const id = nextId++;
  items = [...items, { id, message, tone }];
  emit();
  setTimeout(() => {
    items = items.filter(t => t.id !== id);
    emit();
  }, ttl);
}

export function useToasts() {
  const [current, setCurrent] = useState(items);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(items);
    return () => listeners.delete(setCurrent);
  }, []);
  return current;
}
