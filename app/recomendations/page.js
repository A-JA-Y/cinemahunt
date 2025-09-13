'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../FireBase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

export default function RecommendationsPage() {
  const [likedMovies, setLikedMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchLikedMovies(currentUser.uid);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchLikedMovies = async (userId) => {
    setLoading(true);
    const q = query(collection(db, "likes"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const movies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLikedMovies(movies);
    setLoading(false);
  };

  const getRecommendations = async () => {
    if (likedMovies.length === 0) {
      alert("Like some movies first to get recommendations!");
      return;
    }
    setGenerating(true);
    const randomMovie = likedMovies[Math.floor(Math.random() * likedMovies.length)];
    const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
    const url = `https://www.omdbapi.com/?s=${randomMovie.title}&apikey=${apiKey}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.Response === "True") {
        const likedMovieId = randomMovie.id.split('_')[1];
        setRecommendations(data.Search.filter(m => m.imdbID !== likedMovieId));
      }
    } catch (error) {
      console.error("Error fetching recommendations: ", error);
    }
    setGenerating(false);
  };

  if (loading) return <div className="text-center text-white p-10">Loading...</div>;
  if (!user) return <div className="text-center text-white p-10"><p>Please log in.</p><Link href="/" className="text-purple-400">Home</Link></div>;

  return (
    <main className="p-8 bg-black min-h-screen text-white">
      <h1 className="text-5xl font-bold text-center mb-8">CinemaHunt</h1>
      <div className="text-center mb-12">
        <button onClick={getRecommendations} disabled={generating} className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500">
          {generating ? 'Thinking...' : 'Get New Recommendations'}
        </button>
      </div>

      {recommendations.length > 0 && (
        <>
          <h2 className="text-3xl font-bold mb-6">You might also like...</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {recommendations.map((movie, index) => (
              <div key={index} className="bg-gray-800 rounded-lg"><img src={movie.Poster} alt={movie.Title} className="w-full h-96 object-cover" /><div className="p-4"><h3 className="font-bold">{movie.Title}</h3><p>{movie.Year}</p></div></div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-3xl font-bold mt-12 mb-6">Your Liked Movies</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {likedMovies.map((movie) => (
          <div key={movie.id} className="bg-gray-800 rounded-lg"><img src={movie.poster} alt={movie.title} className="w-full h-96 object-cover" /><div className="p-4"><h3 className="font-bold">{movie.title}</h3><p>{movie.year}</p></div></div>
        ))}
      </div>
       <div className="text-center mt-12"><Link href="/" className="text-purple-400">&larr; Back to Search</Link></div>
    </main>
  );
}