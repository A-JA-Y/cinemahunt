import { NextResponse } from 'next/server';
import { omdbDetails, tmdbFromImdb, tmdbProviders, DataError } from '../../../lib/movies';

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get('region') ?? 'US').toUpperCase().slice(0, 2);

  if (!/^tt\d+$/.test(id)) {
    return NextResponse.json({ error: 'Expected an IMDb id such as tt0133093.' }, { status: 400 });
  }

  try {
    const details = await omdbDetails(id);
    const tmdb = await tmdbFromImdb(id);
    const providers = tmdb?.tmdbId ? await tmdbProviders(tmdb.tmdbId, region) : null;

    return NextResponse.json({
      ...details,
      tmdbId: tmdb?.tmdbId ?? null,
      backdrop: tmdb?.backdrop ?? null,
      // TMDB's overview is a cleaner marketing blurb than OMDb's full plot dump;
      // keep both so the page can lead with one and reveal the other.
      overview: tmdb?.overview ?? null,
      poster: details.poster ?? tmdb?.poster ?? null,
      availability: providers
    });
  } catch (error) {
    const status = error instanceof DataError ? error.status : 502;
    return NextResponse.json({ error: error.message }, { status });
  }
}
