'use client';

import { Card } from '@/components/ui/card';
import MuxPlayer from '@mux/mux-player-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Movie {
  id: string;
  title: string;
  blobUrl: string;
  assetId: string;
  playbackId: string;
  subtitleTrack?: string | null;
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
  const [isSeeking, setIsSeeking] = useState(false);
  const isApplyingRemoteStateRef = useRef(false);
  const hasUserInteractedRef = useRef(false);


  const uploadSubtitles = useQuery({
    queryKey: ['upload-subtitles', movie.assetId],
    queryFn: async () => {
      const { data } = await axios.post('/api/upload-subtitles', {
        assetId: movie.assetId,
        url: "https://bwmmuzylky4hiheu.public.blob.vercel-storage.com/hamilton-subtitles.vtt"
      });
      console.log('data', data);
      return data.message;
    },
    enabled: !!movie.assetId,
  });

  useEffect(() => {
    onMovieSelect(movie.id);

  }, [movie.id]);

  useEffect(() => {
    const markInteracted = () => {
      if (hasUserInteractedRef.current) return;
      hasUserInteractedRef.current = true;

      const mediaElement = getMediaElement(videoRef);
      if (mediaElement) mediaElement.muted = false;
    };

    window.addEventListener('pointerdown', markInteracted, { once: true });
    window.addEventListener('keydown', markInteracted, { once: true });

    const mediaElement = getMediaElement(videoRef);
    if (mediaElement) mediaElement.muted = true;

    return () => {
      window.removeEventListener('pointerdown', markInteracted);
      window.removeEventListener('keydown', markInteracted);
    };
  }, [videoRef]);

  useEffect(() => {
    const mediaElement = getMediaElement(videoRef);
    if (!mediaElement || party.currentMovieId !== movie.id) return;

    isApplyingRemoteStateRef.current = true;

    mediaElement.muted = !hasUserInteractedRef.current;

    if (party.isPlaying) {
      if (mediaElement.paused) {
        mediaElement.play().catch(() => {
          // Autoplay may be blocked until user interaction; user can still play manually.
        });
      }
    } else {
      if (!mediaElement.paused) mediaElement.pause();
    }

    if (!isSeeking && Math.abs(mediaElement.currentTime - party.currentTime) > 0.25) {
      mediaElement.currentTime = party.currentTime;
    }

    const t = window.setTimeout(() => {
      isApplyingRemoteStateRef.current = false;
    }, 500);

    return () => window.clearTimeout(t);
  }, [party.currentMovieId, party.isPlaying, party.currentTime, movie.id, videoRef, isSeeking]);

  useEffect(() => {
    if (!socket) return;

    const handleSeek = (data: any) => {
      const mediaElement = getMediaElement(videoRef);
      if (!mediaElement) return;
      if (party.currentMovieId !== movie.id) return;
      if (isSeeking) return;

      const nextTime = typeof data?.currentTime === 'number' ? data.currentTime : data;
      if (typeof nextTime !== 'number' || Number.isNaN(nextTime)) return;

      isApplyingRemoteStateRef.current = true;
      mediaElement.currentTime = nextTime;

      window.setTimeout(() => {
        isApplyingRemoteStateRef.current = false;
      }, 500);
    };

    socket.on('seek', handleSeek);
    return () => {
      socket.off('seek', handleSeek);
    };
  }, [socket, party.currentMovieId, movie.id, isSeeking, videoRef]);

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
          onPlay={() => {
            const mediaElement = getMediaElement(videoRef);
            if (mediaElement && socket && party.currentMovieId === movie.id && !isApplyingRemoteStateRef.current) {
              const currentTime = mediaElement.currentTime || 0;
              socket.emit('play', party.id, currentTime);
            }
          }}
          onPause={() => {
            const mediaElement = getMediaElement(videoRef);
            if (mediaElement && socket && party.currentMovieId === movie.id && !isApplyingRemoteStateRef.current) {
              const currentTime = mediaElement.currentTime || 0;
              socket.emit('pause', party.id, currentTime);
            }
          }}
          onSeeked={() => {
            const mediaElement = getMediaElement(videoRef);
            if (
              mediaElement &&
              socket &&
              party.currentMovieId === movie.id &&
              !isSeeking &&
              !isApplyingRemoteStateRef.current
            ) {
              setIsSeeking(true);
              const newTime = mediaElement.currentTime || 0;
              socket.emit('seek', party.id, newTime);
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
