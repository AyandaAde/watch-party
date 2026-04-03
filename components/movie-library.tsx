'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MultiStepLoader as Loader } from "@/components/ui/multi-step-loader";
import { useMutation } from '@tanstack/react-query';
import { upload } from '@vercel/blob/client';
import axios from 'axios';
import { Play, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Movie {
  id: string;
  title: string;
  blobUrl: string;
  duration: number;
  isDemo: boolean;
  subtitleTrack?: string | null;
}

interface MovieLibraryProps {
  movies: Movie[];
  partyId: string;
  onSelectMovie: (movieId: string) => void;
}

export default function MovieLibrary({ movies, partyId, onSelectMovie }: MovieLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadingStates = [
    {
      text: "Loading your party",
    },
    {
      text: "Buying a condo",
    },
    {
      text: "Traveling to Cabo",
    },
    {
      text: "Meeting Hannah Dodd",
    },
    {
      text: "She knits",
    },
    {
      text: "We go to a bar",
    },
    {
      text: "Have a few drinks",
    },
    {
      text: "We like it",
    },
    {
      text: "The margaritas are on me",
    },
    {
      text: "Welcome to Watch Party",
    },
    {
      text: "This could take a while.",
    },
    {
      text: "You should go get a drink.",
    },
  ];

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const uploadMovie = useMutation({
    mutationFn: async ({ file, duration }: { file: File; duration: number }) => {
      try {
        const title = file.name.replace(/\.[^/.]+$/, '');
        const uploadedBy = sessionStorage.getItem('userId') || 'anonymous';

        const clientPayload = JSON.stringify({
          title,
          duration: duration.toString(),
          uploadedBy,
          size: file.size.toString(),
        });

        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          multipart: true,
          clientPayload,
        });
        console.log('blob', blob);
        return blob;
      } catch (error) {
        console.error('Error uploading movie:', error);
        throw error;
      }
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let fileToUpload = file;

      const duration = await getVideoDuration(fileToUpload);

      uploadMovie.mutate(
        { file: fileToUpload, duration },
        {
          onSuccess: async (data) => {
            await axios.post('/api/movies', {
              partyId,
              title: file.name,
              blobUrl: data.url,
              duration: duration.toString(),
              uploadedBy: sessionStorage.getItem('userId') || 'anonymous',
              size: file.size.toString(),
            }).then(() => {
              setLoading(false);
              router.refresh();
              toast.success("Success", { description: 'Movie uploaded successfully!' });
            }).catch((error) => {
              setLoading(false);
              console.error('Error saving movie', error);
              toast.error("Error", { description: 'Failed to save movie. Please try again.' });
              router.refresh();
            });
          },
          onError: (error) => {
            console.error('Upload error', error);
            setLoading(false);
            toast.error("Error", { description: 'Failed to upload movie. Please try again.' });
          },
        }
      );
    } catch (error) {
      console.error('Error reading video duration:', error);
      toast.error("Error", { description: 'Failed to read video file. Please try again.' });
    }
  };

  const filteredMovies = movies.filter((movie) =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const demoMovies = filteredMovies.filter((m) => m.isDemo);
  const uploadedMovies = filteredMovies.filter((m) => !m.isDemo);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Loader loadingStates={loadingStates} loading={uploadMovie.isPending} duration={2000} />
      <div className="mt-8 space-y-6">
        {/* Search and Upload */}
        <div className="flex gap-2">
          <Input
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-background border-border"
          />
          <label className="cursor-pointer">
            <Button
              asChild
              variant="outline"
              disabled={uploadMovie.isPending || loading}
            >
              <span>
                <Upload className="size-4 mr-2" />
                {uploadMovie.isPending ? 'Uploading...' : 'Upload'}
              </span>
            </Button>
            <Input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadMovie.isPending || loading}
            />
          </label>
        </div>
        {demoMovies.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Demo Movies</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoMovies.map((movie) => (
                <Card
                  key={movie.id}
                  className="p-3 bg-card border border-border hover:border-primary cursor-pointer transition-colors overflow-hidden"
                  onClick={() => onSelectMovie(movie.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate" title={movie.title}>{movie.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Demo • {Math.floor(movie.duration)}s</p>
                    </div>
                    <Play className="w-4 h-4 text-primary shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}  
        {uploadedMovies.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Uploaded Movies</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uploadedMovies.map((movie) => (
                <Card
                  key={movie.id}
                  className="p-3 bg-card border border-border hover:border-primary cursor-pointer transition-colors overflow-hidden"
                  onClick={() => onSelectMovie(movie.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate" title={movie.title}>{movie.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{Math.floor(movie.duration)}s</p>
                    </div>
                    <Play className="w-4 h-4 text-primary shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {filteredMovies.length === 0 && (
          <Card className="p-8 bg-card border border-border text-center">
            <p className="text-muted-foreground">No movies found. Upload a movie to get started!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
