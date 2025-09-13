import MovieSearch from './components/MovieSearch';
import Auth from './components/Auth'; // Import the new Auth component

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-black text-white">
      
      <Auth /> {/* Add the Auth component here */}
      <div className="w-full text-center mt-12">
        <h1 className="text-5xl font-bold">
          CinemaHunt 🎬
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Find your next favorite movie.
        </p>
      </div>

      
      <MovieSearch />

    </main>
  );
}