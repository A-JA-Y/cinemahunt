import { NextResponse } from 'next/server';
import { omdbSearch, tmdbFromImdb, DataError } from '../../../lib/movies';
import { cached, HOUR } from '../../../lib/cache';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  if (query.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  try {
    const data = await cached(`search:${query.toLowerCase()}:${page}`, HOUR, () => omdbSearch(query, page));

    // Pull TMDB stills for the first handful so the results index has something
    // cinematic to reveal on hover. The rest fall back to their OMDb poster.
    const enriched = await Promise.all(
      data.results.map(async (hit, index) => {
        if (index > 7) return hit;
        const tmdb = await tmdbFromImdb(hit.imdbId);
        return {
          ...hit,
          backdrop: tmdb?.backdropSmall ?? null,
          poster: hit.poster ?? tmdb?.poster ?? null,
          voteAverage: tmdb?.voteAverage ?? null
        };
      })
    );

    return NextResponse.json({ results: enriched, total: data.total, query });
  } catch (error) {
    const status = error instanceof DataError ? error.status : 502;
    return NextResponse.json({ error: error.message, results: [] }, { status });
  }
}
