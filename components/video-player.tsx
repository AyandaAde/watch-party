'use client';

import { Card } from '@/components/ui/card';
import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface Movie {
  id: string;
  title: string;
  blobUrl: string;
  assetId: string;
  playbackId: string;
  duration: number;
}

interface WatchParty {
  id: string;
  name: string;
  currentMovieId: string | null;
  currentTime: number;
  isPlaying: boolean;
}

interface VideoPlayerProps {
  movie: Movie;
  party: WatchParty;
  socket: Socket | null;
  videoRef: React.RefObject<any>;
  onMovieSelect: (movieId: string) => void;
}

// Helper to get the media element from MuxPlayer ref
const getMediaElement = (ref: React.RefObject<any>): HTMLVideoElement | null => {
  if (!ref.current) return null;
  // MuxPlayer exposes the media element through the media property
  return ref.current.media || ref.current?.querySelector('video') || null;
};

export default function VideoPlayer({
  movie,
  party,
  socket,
  videoRef,
  onMovieSelect,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    onMovieSelect(movie.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id]);

  // Sync with party state - only update when party state changes
  useEffect(() => {
    const mediaElement = getMediaElement(videoRef);
    if (!mediaElement || party.currentMovieId !== movie.id) return;

    // Sync play/pause state
    if (party.isPlaying && mediaElement.paused) {
      mediaElement.play().catch(() => {
        console.log('[VideoPlayer] Play prevented by browser');
      });
      setIsPlaying(true);
    } else if (!party.isPlaying && !mediaElement.paused) {
      mediaElement.pause();
      setIsPlaying(false);
    }

    // Sync time (only if difference is significant to avoid jitter)
    if (Math.abs(mediaElement.currentTime - party.currentTime) > 1) {
      mediaElement.currentTime = party.currentTime;
      setCurrentTime(party.currentTime);
      lastSyncTimeRef.current = Date.now();
    }
  }, [party.currentMovieId, party.isPlaying, party.currentTime, movie.id, videoRef]);

  // Periodic jitter detection and sync
  useEffect(() => {
    if (party.currentMovieId !== movie.id) return;

    const syncInterval = setInterval(() => {
      const mediaElement = getMediaElement(videoRef);
      if (!mediaElement || !party.isPlaying) return;

      // Don't sync if user just seeked (within last 1.5 seconds)
      const timeSinceLastSeek = Date.now() - lastSyncTimeRef.current;
      if (timeSinceLastSeek < 1500) return;

      const localTime = mediaElement.currentTime || 0;
      const partyTime = party.currentTime || 0;
      const timeDiff = Math.abs(localTime - partyTime);

      // If drift exceeds 0.5 seconds, sync to party time
      if (timeDiff > 0.5) {
        console.log(`[VideoPlayer] Jitter detected: ${timeDiff.toFixed(2)}s drift. Syncing...`);
        mediaElement.currentTime = partyTime;
        setCurrentTime(partyTime);
        lastSyncTimeRef.current = Date.now();
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(syncInterval);
  }, [party.currentMovieId, party.isPlaying, party.currentTime, movie.id, videoRef]);

  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!socket) {
      console.warn('[VideoPlayer] Socket not connected');
      return;
    }

    const mediaElement = getMediaElement(videoRef);
    if (!mediaElement) {
      console.warn('[VideoPlayer] Video element not available');
      return;
    }

    const isCurrentlyPaused = mediaElement.paused;
    const currentTime = mediaElement.currentTime || 0;

    if (isCurrentlyPaused) {
      mediaElement.play().catch((error) => {
        console.error('[VideoPlayer] Play failed:', error);
      });
      socket.emit('play', party.id, currentTime);
      setIsPlaying(true);
    } else {
      mediaElement.pause();
      socket.emit('pause', party.id, currentTime);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const mediaElement = getMediaElement(videoRef);
    if (mediaElement && !isSeeking) {
      setCurrentTime(mediaElement.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const mediaElement = getMediaElement(videoRef);
    if (mediaElement) {
      setDuration(mediaElement.duration);
    }
  };
  
  // Listen for Picture-in-Picture changes and enable controls
  useEffect(() => {
    const handlePiPChange = () => {
      const mediaElement = getMediaElement(videoRef);
      if (mediaElement) {
        const isInPiP =
          document.pictureInPictureElement === mediaElement ||
          (document as any).webkitPictureInPictureElement === mediaElement;

        setIsPictureInPicture(isInPiP);

        // Enable native controls when in PiP mode for play/pause functionality
        if (isInPiP) {
          mediaElement.setAttribute('controls', '');
        } else {
          mediaElement.removeAttribute('controls');
        }
      }
    };

    const mediaElement = getMediaElement(videoRef);
    if (mediaElement) {
      mediaElement.addEventListener('enterpictureinpicture', handlePiPChange);
      mediaElement.addEventListener('leavepictureinpicture', handlePiPChange);
      // WebKit prefix
      mediaElement.addEventListener('webkitbeginfullscreen', handlePiPChange);
      mediaElement.addEventListener('webkitendfullscreen', handlePiPChange);
    }

    // Also listen on document
    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      const mediaElement = getMediaElement(videoRef);
      if (mediaElement) {
        mediaElement.removeEventListener('enterpictureinpicture', handlePiPChange);
        mediaElement.removeEventListener('leavepictureinpicture', handlePiPChange);
        mediaElement.removeEventListener('webkitbeginfullscreen', handlePiPChange);
        mediaElement.removeEventListener('webkitendfullscreen', handlePiPChange);
      }
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, [videoRef]);

  // Handle play/pause events from PiP window controls only
  useEffect(() => {
    const mediaElement = getMediaElement(videoRef);
    if (!mediaElement || !socket || !isPictureInPicture) return;

    let isHandlingPiP = false;

    const handlePiPPlay = (e: Event) => {
      // Only handle if in PiP mode and not already handling
      if (isPictureInPicture && !isHandlingPiP && mediaElement) {
        isHandlingPiP = true;
        const wasPaused = !isPlaying;
        if (wasPaused) {
          socket.emit('play', party.id, mediaElement.currentTime || 0);
          setIsPlaying(true);
        }
        setTimeout(() => { isHandlingPiP = false; }, 100);
      }
    };

    const handlePiPPause = (e: Event) => {
      // Only handle if in PiP mode and not already handling
      if (isPictureInPicture && !isHandlingPiP && mediaElement) {
        isHandlingPiP = true;
        const wasPlaying = isPlaying;
        if (wasPlaying) {
          socket.emit('pause', party.id, mediaElement.currentTime || 0);
          setIsPlaying(false);
        }
        setTimeout(() => { isHandlingPiP = false; }, 100);
      }
    };

    mediaElement.addEventListener('play', handlePiPPlay);
    mediaElement.addEventListener('pause', handlePiPPause);

    return () => {
      mediaElement.removeEventListener('play', handlePiPPlay);
      mediaElement.removeEventListener('pause', handlePiPPause);
    };
  }, [videoRef, isPictureInPicture, socket, party.id, isPlaying]);

  return (
    <Card className="bg-card border border-border overflow-hidden">
      {/* Video Container */}
      <div className="bg-black relative group">
        <MuxPlayer
          ref={videoRef}
          playbackId={movie.blobUrl.includes("mkv") ? movie.playbackId : undefined}
          src={movie.blobUrl.includes("mkv") ? undefined : movie.blobUrl}
          metadata={{
            video_id: movie.id,
            video_title: movie.title,
          }}
          accentColor='#e50914'
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => {
            const mediaElement = getMediaElement(videoRef);
            if (mediaElement && socket && party.currentMovieId === movie.id) {
              setIsPlaying(true);
              const currentTime = mediaElement.currentTime || 0;
              socket.emit('play', party.id, currentTime);
            }
          }}
          onPause={() => {
            const mediaElement = getMediaElement(videoRef);
            if (mediaElement && socket && party.currentMovieId === movie.id) {
              setIsPlaying(false);
              const currentTime = mediaElement.currentTime || 0;
              socket.emit('pause', party.id, currentTime);
            }
          }}
          onSeeked={() => {
            const mediaElement = getMediaElement(videoRef);
            if (mediaElement && socket && party.currentMovieId === movie.id && !isSeeking) {
              setIsSeeking(true);
              const newTime = mediaElement.currentTime || 0;
              socket.emit('seek', party.id, newTime);
              lastSyncTimeRef.current = Date.now();
              setTimeout(() => setIsSeeking(false), 500);
            }
          }}
          className="w-full h-auto aspect-video"
          style={{ aspectRatio: '16/9' }}
        />
      </div>
    </Card>
  );
}
