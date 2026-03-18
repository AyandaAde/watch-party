'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import VideoPlayer from '@/components/video-player';
import PartyInfo from '@/components/party-info';
import MovieLibrary from '@/components/movie-library';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

interface WatchParty {
  id: string;
  name: string;
  currentMovieId: string | null;
  currentTime: number;
  isPlaying: boolean;
  members: Array<{ id: string; username: string; isActive: boolean }>;
}

interface Movie {
  id: string;
  title: string;
  blobUrl: string;
  duration: number;
  assetId: string;
  playbackId: string;
  isDemo: boolean;
}

export default function PartyPage() {
  const params = useParams();
  const router = useRouter();
  const partyId = params.partyId as string;

  const [party, setParty] = useState<WatchParty | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMovieLibrary, setShowMovieLibrary] = useState(false);
  const videoRef = useRef<any>(null);

  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const username = sessionStorage.getItem('username');

    if (!userId || !username) {
      router.push('/');
      return;
    }

    const fetchParty = async () => {
      try {
        const response = await fetch(`/api/parties?id=${partyId}`);
        const data = await response.json();
        setParty(data);
      } catch (error) {
        console.error('Error fetching party:', error);
      }
    };

    const fetchMovies = async () => {
      try {
        const response = await fetch('/api/movies');
        const data = await response.json();
        setMovies(data);
      } catch (error) {
        console.error('Error fetching movies:', error);
      }
    };

    fetchParty();
    fetchMovies();

    // const newSocket = io(undefined, {
    //   reconnectionDelay: 1000,
    //   reconnection: true,
    //   reconnectionAttempts: 5,
    //   transports: ['websocket'],
    // });

    const newSocket = io(`https://watch-party-7g0j.onrender.com`, {
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 5,
      transports: ['websocket']
    })


    newSocket.on('connect', () => {
      newSocket.emit('join-party', partyId, userId, username);
    });

    newSocket.on('member-joined', (data) => {
      setParty((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: [...prev.members, { id: data.socketId, username: data.username, isActive: true }],
        };
      });
    });

    newSocket.on('member-left', (data) => {
      setParty((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members.filter((m) => m.id !== data.socketId),
        };
      });
    });

    newSocket.on('play', (data) => {
      setParty((prev) => {
        if (!prev) return null;
        return { ...prev, isPlaying: true, currentTime: data.currentTime || data };
      });
    });

    newSocket.on('pause', (data) => {
      setParty((prev) => {
        if (!prev) return null;
        return { ...prev, isPlaying: false, currentTime: data.currentTime || data };
      });
    });

    newSocket.on('seek', (data) => {
      console.log('[v0] Seek event received');
      setParty((prev) => {
        if (!prev) return null;
        return { ...prev, currentTime: data.currentTime || data };
      });
    });

    newSocket.on('next-movie', (data) => {
      console.log('[v0] Next movie event received');
      setParty((prev) => {
        if (!prev) return null;
        return { ...prev, currentMovieId: data.movieId, currentTime: 0, isPlaying: true };
      });
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    });

    newSocket.on('previous-movie', (data) => {
      console.log('[v0] Previous movie event received');
      setParty((prev) => {
        if (!prev) return null;
        return { ...prev, currentMovieId: data.movieId, currentTime: 0, isPlaying: true };
      });
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    });

    setSocket(newSocket);
    setLoading(false);

    return () => {
      if (newSocket) {
        newSocket.emit('leave-party', partyId);
        newSocket.disconnect();
      }
    };
  }, [partyId, router]);

  if (loading || !party) {
    return (
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/backdrop.PNG')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
        <img
          src="/logo.PNG"
          alt="WatchParty logo"
          className="absolute top-6 left-6 z-20 h-12 w-auto"
        />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <Card className="p-8 bg-card border border-border">
            <p className="text-foreground">Loading party...</p>
          </Card>
        </div>
      </div>
    );
  }

  const currentMovie = movies.find((m) => m.id === party.currentMovieId);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/backdrop.PNG')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
      <Image
        src="/logo.PNG"
        width={100}
        height={100}
        alt="WatchParty logo"
        className="absolute top-6 left-6 z-20 h-12 w-auto"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{party.name}</h1>
            <p className="text-muted-foreground">Party Code: {partyId.substring(0, 8).toUpperCase()}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            Leave Party
          </Button>
        </div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            {currentMovie ? (
              <VideoPlayer
                movie={currentMovie}
                party={party}
                socket={socket}
                videoRef={videoRef}
                onMovieSelect={(movieId) => {
                  setParty((prev) => {
                    if (!prev) return null;
                    return { ...prev, currentMovieId: movieId, currentTime: 0, isPlaying: true };
                  });
                }}
              />
            ) : (
              <Card className="p-8 bg-card border border-border aspect-video flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No movie selected</p>
                  <Button onClick={() => setShowMovieLibrary(true)}>Choose a Movie</Button>
                </div>
              </Card>
            )}

            {/* Movie Library Toggle */}
            <div className="mt-6">
              <Button
                onClick={() => setShowMovieLibrary(!showMovieLibrary)}
                variant="outline"
                className="w-full"
              >
                {showMovieLibrary ? 'Hide Library' : 'Show Library'}
              </Button>
            </div>

            {/* Movie Library */}
            {showMovieLibrary && (
              <MovieLibrary
                movies={movies}
                onSelectMovie={(movieId) => {
                  socket?.emit('next-movie', partyId, movieId, 0);
                  setShowMovieLibrary(false);
                }}
              />
            )}
          </div>

          {/* Sidebar */}
          <div>
            <PartyInfo party={party} />
          </div>
        </div>
      </div>
    </div>
  );
}
