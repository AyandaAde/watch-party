'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Maximize, Minimize, Pause, PictureInPicture, Play, Volume1 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Movie {
  id: string;
  title: string;
  blobUrl: string;
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
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onMovieSelect: (movieId: string) => void;
}

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
  const [volume, setVolume] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);

  // Sync state with party updates
  useEffect(() => {
    if (videoRef.current && party.currentMovieId === movie.id) {
      // Sync play/pause state
      if (party.isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {
          console.log('[v0] Play prevented by browser');
        });
        setIsPlaying(true);
      } else if (!party.isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      // Sync time (only if difference is significant to avoid jitter)
      if (Math.abs(videoRef.current.currentTime - party.currentTime) > 1) {
        videoRef.current.currentTime = party.currentTime;
        setCurrentTime(party.currentTime);
      }
    }
  }, [party, movie.id, videoRef]);

  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!socket) {
      console.warn('[VideoPlayer] Socket not connected');
      return;
    }
    
    if (!videoRef.current) {
      console.warn('[VideoPlayer] Video element not available');
      return;
    }

    const isCurrentlyPaused = videoRef.current.paused;
    const currentTime = videoRef.current.currentTime || 0;
    
    // Update video element first, then emit socket event
    if (isCurrentlyPaused) {
      // Video is paused, so play it
      videoRef.current.play().catch((error) => {
        console.error('[VideoPlayer] Play failed:', error);
      });
      socket.emit('play', party.id, currentTime);
      setIsPlaying(true);
    } else {
      // Video is playing, so pause it
      videoRef.current.pause();
      socket.emit('pause', party.id, currentTime);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeeking) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!socket || !videoRef.current) return;

    setIsSeeking(true);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    socket.emit('seek', party.id, newTime);

    setTimeout(() => setIsSeeking(false), 500);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen();
        } else if ((videoRef.current as any).webkitRequestFullscreen) {
          await (videoRef.current as any).webkitRequestFullscreen();
        } else if ((videoRef.current as any).mozRequestFullScreen) {
          await (videoRef.current as any).mozRequestFullScreen();
        } else if ((videoRef.current as any).msRequestFullscreen) {
          await (videoRef.current as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Check if Picture-in-Picture is supported
  useEffect(() => {
    if (videoRef.current) {
      setIsPiPSupported(
        'pictureInPictureEnabled' in document ||
        (videoRef.current as any).webkitSupportsPresentationMode !== undefined
      );
    }
  }, [videoRef]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement)
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Listen for Picture-in-Picture changes and enable controls
  useEffect(() => {
    const handlePiPChange = () => {
      if (videoRef.current) {
        const isInPiP = 
          document.pictureInPictureElement === videoRef.current ||
          (document as any).webkitPictureInPictureElement === videoRef.current;
        
        setIsPictureInPicture(isInPiP);
        
        // Enable native controls when in PiP mode for play/pause functionality
        if (isInPiP) {
          videoRef.current.setAttribute('controls', '');
        } else {
          videoRef.current.removeAttribute('controls');
        }
      }
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('enterpictureinpicture', handlePiPChange);
      videoRef.current.addEventListener('leavepictureinpicture', handlePiPChange);
      // WebKit prefix
      videoRef.current.addEventListener('webkitbeginfullscreen', handlePiPChange);
      videoRef.current.addEventListener('webkitendfullscreen', handlePiPChange);
    }

    // Also listen on document
    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('enterpictureinpicture', handlePiPChange);
        videoRef.current.removeEventListener('leavepictureinpicture', handlePiPChange);
        videoRef.current.removeEventListener('webkitbeginfullscreen', handlePiPChange);
        videoRef.current.removeEventListener('webkitendfullscreen', handlePiPChange);
      }
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, [videoRef]);

  // Handle play/pause events from PiP window controls only
  useEffect(() => {
    if (!videoRef.current || !socket || !isPictureInPicture) return;

    let isHandlingPiP = false;

    const handlePiPPlay = (e: Event) => {
      // Only handle if in PiP mode and not already handling
      if (isPictureInPicture && !isHandlingPiP && videoRef.current) {
        isHandlingPiP = true;
        const wasPaused = !isPlaying;
        if (wasPaused) {
          socket.emit('play', party.id, videoRef.current.currentTime || 0);
          setIsPlaying(true);
        }
        setTimeout(() => { isHandlingPiP = false; }, 100);
      }
    };

    const handlePiPPause = (e: Event) => {
      // Only handle if in PiP mode and not already handling
      if (isPictureInPicture && !isHandlingPiP && videoRef.current) {
        isHandlingPiP = true;
        const wasPlaying = isPlaying;
        if (wasPlaying) {
          socket.emit('pause', party.id, videoRef.current.currentTime || 0);
          setIsPlaying(false);
        }
        setTimeout(() => { isHandlingPiP = false; }, 100);
      }
    };

    const video = videoRef.current;
    video.addEventListener('play', handlePiPPlay);
    video.addEventListener('pause', handlePiPPause);

    return () => {
      video.removeEventListener('play', handlePiPPlay);
      video.removeEventListener('pause', handlePiPPause);
    };
  }, [videoRef, isPictureInPicture, socket, party.id, isPlaying]);

  const handlePictureInPicture = async () => {
    if (!videoRef.current) return;

    try {
      if (isPictureInPicture) {
        // Exit Picture-in-Picture
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if ((document as any).webkitExitPictureInPicture) {
          await (document as any).webkitExitPictureInPicture();
        }
      } else {
        // Enter Picture-in-Picture
        if (videoRef.current.requestPictureInPicture) {
          await videoRef.current.requestPictureInPicture();
        } else if ((videoRef.current as any).webkitSetPresentationMode) {
          await (videoRef.current as any).webkitSetPresentationMode('picture-in-picture');
        }
      }
    } catch (error) {
      console.error('Error toggling Picture-in-Picture:', error);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="bg-card border border-border overflow-hidden">
      {/* Video Container */}
      <div className="bg-black relative group">
        <video
          ref={videoRef}
          src={movie.blobUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-auto aspect-video"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-muted rounded-lg accent-primary cursor-pointer"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              <div className="text-sm text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Volume1 className="w-4 h-4 text-white" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume;
                  }
                }}
                className="w-20 h-1 bg-muted rounded-lg accent-primary cursor-pointer"
              />
              {isPiPSupported && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePictureInPicture}
                  className="text-white hover:bg-white/20"
                  title={isPictureInPicture ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'}
                >
                  <PictureInPicture className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFullscreen}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4 bg-card">
        <h2 className="text-xl font-bold mb-4">{movie.title}</h2>

        {/* Playback Controls */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            className="flex-1"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>
        </div>

        {/* Status */}
        <div className="mt-4 p-3 bg-background rounded-lg text-sm">
          <p className="text-muted-foreground">
            {isPlaying ? '▶️ Playing' : '⏸️ Paused'} • {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>
      </div>
    </Card>
  );
}
