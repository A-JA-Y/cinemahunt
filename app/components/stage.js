'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * "What films are on screen right now", for Pix to talk about.
 *
 * Several sections can be showing films at the same time — the landing page has
 * trending posters, search results and mood picks all mounted at once — so each
 * publishes under its own source name and the store decides which one Pix should
 * care about:
 *
 *   - a film's own detail page always wins
 *   - the trending carousel always loses, since it is ambient
 *   - between the deliberate ones (search, mood, your list) the most recent wins
 *
 * Module-level rather than React context: the publishers and the single consumer
 * sit in completely different branches of the tree.
 */

const PRIORITY = {
  detail: 100,
  mood: 60,
  search: 60,
  list: 60,
  trending: 20
};

const sources = new Map(); // source -> { movies, at }
const listeners = new Set();
let current = [];

function recompute() {
  let best = null;

  for (const [source, entry] of sources) {
    if (!entry.movies.length) continue;
    const rank = PRIORITY[source] ?? 50;
    if (!best || rank > best.rank || (rank === best.rank && entry.at > best.at)) {
      best = { rank, at: entry.at, movies: entry.movies };
    }
  }

  const next = best?.movies ?? [];

  // Cheap identity check: publishers re-render often, and emitting a fresh array
  // every time would restart Pix's idle timer forever.
  const same = next.length === current.length && next.every((m, i) => m.title === current[i].title);
  if (same) return;

  current = next;
  for (const listener of listeners) listener(current);
}

/**
 * @param {keyof PRIORITY} source
 * @param {Array<{imdbId?: string, title: string, year?: string|null}>} movies
 */
export function publishStage(source, movies) {
  const clean = (Array.isArray(movies) ? movies : [])
    .filter(m => m?.title)
    .map(m => ({ imdbId: m.imdbId ?? null, title: m.title, year: m.year ?? null }))
    // Beyond a handful Pix is picking at random anyway.
    .slice(0, 12);

  const previous = sources.get(source);
  const unchanged =
    previous &&
    previous.movies.length === clean.length &&
    previous.movies.every((m, i) => m.title === clean[i].title);

  // Keep the original timestamp when nothing changed, so a re-render does not
  // let a stale section jump the recency queue.
  if (!unchanged) sources.set(source, { movies: clean, at: Date.now() });

  recompute();
}

export function clearStage(source) {
  sources.delete(source);
  recompute();
}

export function useStage() {
  const [movies, setMovies] = useState(current);
  useEffect(() => {
    listeners.add(setMovies);
    setMovies(current);
    return () => listeners.delete(setMovies);
  }, []);
  return movies;
}

/**
 * Publish from a component and withdraw on unmount.
 *
 * @param {keyof PRIORITY} source
 * @param {Array<object>} movies  Memoise this, or pass a stable array.
 */
export function useStagePublisher(source, movies) {
  const latest = useRef(movies);
  latest.current = movies;

  useEffect(() => {
    publishStage(source, latest.current);
  }, [source, movies]);

  useEffect(() => () => clearStage(source), [source]);
}
