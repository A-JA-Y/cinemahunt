import { NextResponse } from 'next/server';
import { tmdbTrending, tmdbExternalIds, hasTmdb } from '../../../lib/movies';

export async function GET() {
  if (!hasTmdb()) {
    return NextResponse.json({ results: [], reason: 'TMDB_API_KEY is not set.' });
  }

  const trending = await tmdbTrending();

  // Resolve IMDb ids so clicking a poster in the hero lands on the same detail
  // route (and the same Firestore like key) as a search result.
  const results = await Promise.all(
    trending.map(async movie => ({ ...movie, imdbId: await tmdbExternalIds(movie.tmdbId) }))
  );

  return NextResponse.json({ results: results.filter(m => m.imdbId) });
}
