'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// A new UI component to display the Vibe Meter
function VibeMeter({ vibeData }) {
  if (!vibeData || vibeData.error) return null;

  return (
    <div className="mt-10 bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-4 text-center text-purple-400">Vibe Meter</h2>
      <div className="flex flex-col md:flex-row justify-around text-center gap-4">
        <div>
          <h3 className="font-bold text-lg">Beginning</h3>
          <p className="font-semibold text-xl text-white">{vibeData.beginning?.vibe}</p>
          <p className="text-sm text-gray-300 mt-1">{vibeData.beginning?.description}</p>
        </div>
        <div className="border-t md:border-t-0 md:border-l border-gray-600 my-4 md:my-0"></div>
        <div>
          <h3 className="font-bold text-lg">Middle</h3>
          <p className="font-semibold text-xl text-white">{vibeData.middle?.vibe}</p>
          <p className="text-sm text-gray-300 mt-1">{vibeData.middle?.description}</p>
        </div>
        <div className="border-t md:border-t-0 md:border-l border-gray-600 my-4 md:my-0"></div>
        <div>
          <h3 className="font-bold text-lg">End</h3>
          <p className="font-semibold text-xl text-white">{vibeData.end?.vibe}</p>
          <p className="text-sm text-gray-300 mt-1">{vibeData.end?.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function MovieDetailPage() {
  const params = useParams();
  const { id } = params;
  const [movieDetails, setMovieDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vibeData, setVibeData] = useState(null);
  const [isVibeLoading, setIsVibeLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchAllData = async () => {
        setLoading(true);
        setIsVibeLoading(true);

        // 1. Fetch standard movie details from OMDb
        const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
        const url = `https://www.omdbapi.com/?i=${id}&plot=full&apikey=${apiKey}`;
        let plot = '';
        try {
          const res = await fetch(url);
          const data = await res.json();
          setMovieDetails(data);
          if (data.Plot && data.Plot !== 'N/A') {
            plot = data.Plot;
          }
        } catch (error) {
          console.error("Failed to fetch movie details", error);
        }
        setLoading(false);

        // 2. If we got a plot, send it to our own API to get the AI vibe
        if (plot) {
          try {
            const response = await fetch('/api/vibe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plot }),
            });
            const vibe = await response.json();
            setVibeData(vibe);
          } catch (error) {
            console.error("Failed to fetch vibe", error);
          }
        }
        setIsVibeLoading(false);
      };
      fetchAllData();
    }
  }, [id]);

  if (loading) return <div className="text-center text-white p-10">Loading movie details...</div>;
  if (!movieDetails || movieDetails.Response === "False") return <div className="text-center text-white p-10">Movie not found.</div>;

  return (
    <main className="p-4 sm:p-8 bg-black min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-bold mb-4">{movieDetails.Title}</h1>
        <p className="text-gray-400 mb-8">{movieDetails.Year} · {movieDetails.Rated} · {movieDetails.Runtime}</p>
        <div className="flex flex-col md:flex-row gap-8">
          <img src={movieDetails.Poster} alt={movieDetails.Title} className="w-full md:w-1/3 rounded-lg shadow-lg"/>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Plot</h2>
            <p className="mb-6 leading-relaxed">{movieDetails.Plot}</p>
            <p><strong>Director:</strong> {movieDetails.Director}</p>
            <p><strong>Actors:</strong> {movieDetails.Actors}</p>
          </div>
        </div>
        
        {isVibeLoading ? <p className="text-center mt-10">Generating AI Vibe Meter...</p> : <VibeMeter vibeData={vibeData} />}

        <div className="text-center mt-12">
          <Link href="/" className="text-purple-400 hover:underline">&larr; Back to Search</Link>
        </div>
      </div>
    </main>
  );
}