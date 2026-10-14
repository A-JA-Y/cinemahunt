'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../FireBase';
import { toast } from './toast';

/**
 * Auth state plus the signed-in viewer's liked films.
 *
 * Document ids stay `${uid}_${imdbID}` in the top-level `likes` collection, which
 * is the schema the previous build wrote — existing likes keep working.
 *
 * Toggling is optimistic: the heart fills instantly and only rolls back if
 * Firestore rejects the write.
 */
export function useLikes() {
  const [user, setUser] = useState(null);
  const [likes, setLikes] = useState(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (!currentUser) {
        setLikes(new Map());
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snapshot = await getDocs(
          query(collection(db, 'likes'), where('userId', '==', currentUser.uid))
        );
        const next = new Map();
        for (const document of snapshot.docs) {
          const data = document.data();
          // Older documents predate the imdbId field; recover it from the doc id.
          const imdbId = data.imdbId ?? document.id.split('_')[1];
          if (imdbId) next.set(imdbId, { imdbId, ...data });
        }
        setLikes(next);
      } catch (error) {
        toast('Could not load your likes.', { tone: 'ember' });
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const isLiked = useCallback(imdbId => likes.has(imdbId), [likes]);

  const toggleLike = useCallback(
    async movie => {
      if (!user) {
        toast('Sign in to keep a film.', { tone: 'ember' });
        return;
      }
      const { imdbId } = movie;
      if (!imdbId) return;

      const wasLiked = likes.has(imdbId);
      const snapshot = new Map(likes);

      // Optimistic flip.
      setLikes(prev => {
        const next = new Map(prev);
        if (wasLiked) next.delete(imdbId);
        else
          next.set(imdbId, {
            imdbId,
            title: movie.title,
            year: movie.year ?? null,
            poster: movie.poster ?? null
          });
        return next;
      });

      try {
        const ref = doc(db, 'likes', `${user.uid}_${imdbId}`);
        if (wasLiked) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            userId: user.uid,
            userEmail: user.email,
            imdbId,
            title: movie.title,
            year: movie.year ?? null,
            poster: movie.poster ?? null,
            likedAt: Date.now()
          });
        }
        toast(wasLiked ? `Removed ${movie.title}` : `Kept ${movie.title}`);
      } catch (error) {
        setLikes(snapshot);
        toast('That did not save. Try again.', { tone: 'ember' });
      }
    },
    [user, likes]
  );

  return { user, likes, likedList: [...likes.values()], isLiked, toggleLike, loading };
}
