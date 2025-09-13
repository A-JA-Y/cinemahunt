'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../FireBase'; // Import db and auth
import { doc, setDoc, collection } from 'firebase/firestore'; // Import Firestore functions
import { onAuthStateChanged } from 'firebase/auth'; // To get the current user
import Link from 'next/link';

export default function MovieSearch() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null); // State to hold the current user

  // Listen for user auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const searchMovies = async (e) => {
    e.preventDefault();
    setError(null);
    const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
    const url = `https://www.omdbapi.com/?s=${query}&apikey=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.Response === "True") {
        setMovies(data.Search);
        e.target.value("")
      } else {
        setError(data.Error);
        setMovies([]);
      }
    } catch (err) {
      setError('An error occurred while fetching data.');
    }
  };

  const handleLikeMovie = async (movie) => {
    if (!user) {
      alert("You must be logged in to like a movie.");
      return;
    }
    try {
      // Create a reference to a document in a top-level 'likes' collection
      // The document will be named with the user's ID and the movie's ID
      const likeRef = doc(db, "likes", `${user.uid}_${movie.imdbID}`);
      await setDoc(likeRef, {
        userId: user.uid,
        userEmail: user.email,
        title: movie.Title,
        year: movie.Year,
        poster: movie.Poster
      });
      alert(`Liked ${movie.Title}!`);
    } catch (err) {
      console.error("Error liking movie: ", err);
      alert("Failed to like the movie.");
    }
  };

  return (
    <div className="w-full max-w-4xl mt-8">
      <form onSubmit={searchMovies} className="w-full max-w-xl mx-auto">
        <div className="flex">
          <input
            type="text"
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g. The Matrix"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-r-lg hover:bg-purple-700 focus:outline-none"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mt-12">
        {error && <p className="text-red-500 text-center">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {movies.map((movie) => (
            <Link key={movie.imdbID} href={`/movie/${movie.imdbID}`}>
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg relative h-full flex flex-col cursor-pointer hover:ring-2 hover:ring-purple-500">
                <img
                  src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450.png?text=No+Image'}
                  alt={`${movie.Title} Poster`}
                  className="w-full h-96 object-cover"
                />
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-bold text-lg truncate">{movie.Title}</h3>
                  <p className="text-gray-400">{movie.Year}</p>
                  {/* The "Like" button stays here */}
                  {user && (
                    <button
                      onClick={(e) => {
                        e.preventDefault(); // Prevents the link from navigating
                        handleLikeMovie(movie);
                      }}
                      
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}