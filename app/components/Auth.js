'use client';

import { useState, useEffect } from 'react';
import { auth } from '../FireBase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import Link from 'next/link';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false); // New state to toggle UI

  const [mood, setMood] = useState('Happy');
  const [suggestion, setSuggestion] = useState(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleMoodSuggestion = async () => {
    setIsLoadingSuggestion(true);
    setSuggestion(null);
    setError(null);
    try {
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuggestion(data);
      }
    } catch (err) {
      setError("Failed to fetch suggestion.");
    }
    setIsLoadingSuggestion(false);
  };

  if (user) {
    return (
      <div className="text-center mt-4 flex items-center justify-center gap-4">
        <p>Welcome, {user.email}</p>
        <Link href="/recomendations" className="text-purple-400 hover:underline">My Liked Movies</Link>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-600 rounded">Logout</button>
      </div>
    );
  }

  // If the user wants to log in, show the form
  if (showLoginForm) {
    return (
      <div className="w-full max-w-xs mx-auto mt-8">
        <form className="bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-2xl text-center font-bold mb-6">Login / Sign Up</h2>
          <div className="mb-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 bg-gray-700 rounded"/>
          </div>
          <div className="mb-6">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 bg-gray-700 rounded"/>
          </div>
          {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button onClick={handleLogin} className="px-4 py-2 bg-purple-600 rounded">Login</button>
            <button onClick={handleSignUp} className="px-4 py-2 bg-green-600 rounded">Sign Up</button>
          </div>
        </form>
        <button onClick={() => setShowLoginForm(false)} className="text-purple-400 hover:underline">Back to Mood Selector</button>
      </div>
    );
  }
  
  // Default view for logged-out users is the MOOD SELECTOR
  return (
    <div className="w-full max-w-md mx-auto mt-8 text-center">
      <h2 className="text-2xl font-bold mb-4">How's your mood today?</h2>
      <div className="flex justify-center gap-4">
        <select value={mood} onChange={(e) => setMood(e.target.value)} className="px-4 py-2 bg-gray-800 border rounded-lg">
          <option>Happy</option>
          <option>Sad</option>
          <option>Adventurous</option>
          <option>Romantic</option>
          <option>Scared</option>
        </select>
        <button onClick={handleMoodSuggestion} disabled={isLoadingSuggestion} className="px-6 py-2 bg-green-600 rounded-lg disabled:bg-gray-500">
          {isLoadingSuggestion ? 'Thinking...' : 'Get Suggestion'}
        </button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {suggestion && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg inline-block">
          <h3 className="font-bold text-xl mb-2">You should watch:</h3>
          <img src={suggestion.Poster} alt={suggestion.Title} className="mx-auto rounded-lg" />
          <p className="font-bold text-lg mt-2">{suggestion.Title}</p>
          <p className="text-gray-400">{suggestion.Year}</p>
        </div>
      )}
      <p className="mt-8">Or, <button onClick={() => setShowLoginForm(true)} className="text-purple-400 hover:underline">create an account</button> to get personal recommendations!</p>
    </div>
  );
}