import { NextResponse } from 'next/server';
import { tmdbFromImdb, tmdbVideos, hasTmdb } from '../../../../lib/movies';

export async function GET(request, { params }) {
  const { id } = await params;

  if (!/^tt\d+$/.test(id)) {
    return NextResponse.json({ error: 'Expected an IMDb id such as tt0133093.' }, { status: 400 });
  }
  if (!hasTmdb()) {
    return NextResponse.json({ videos: [], reason: 'TMDB_API_KEY is not set.' });
  }

  const tmdb = await tmdbFromImdb(id);
  if (!tmdb?.tmdbId) return NextResponse.json({ videos: [] });

  return NextResponse.json({ videos: await tmdbVideos(tmdb.tmdbId) });
}
