'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { upload } from '@vercel/blob/client';
import { Play, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { MultiStepLoader as Loader } from "@/components/ui/multi-step-loader";
import axios from 'axios';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface Movie {
  id: string;
  title: string;
  blobUrl: string;
  duration: number;
  isDemo: boolean;
}

interface MovieLibraryProps {
  movies: Movie[];
  onSelectMovie: (movieId: string) => void;
}

export default function MovieLibrary({ movies, onSelectMovie }: MovieLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const router = useRouter();

  const loadingStates = [
    {
      text: "Loading your party",
    },
    {
      text: "Buying a condo",
    },
    {
      text: "Travelling to Cabo",
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

  // Preload FFmpeg on component mount
  useEffect(() => {
    loadFFmpeg().catch((error) => {
      console.error('Failed to preload FFmpeg:', error);
      toast.error("FFmpeg Error", { 
        description: "Failed to load video converter. MKV conversion may not work." 
      });
    });
  }, []);

  // Load FFmpeg
  const loadFFmpeg = async () => {
    if (ffmpegLoaded && ffmpegRef.current) return;

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      // Add progress logging
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      // Use UMD build for better compatibility
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setFfmpegLoaded(true);
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw new Error(`Failed to load FFmpeg: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Convert MKV to MP4
  const convertMkvToMp4 = async (file: File): Promise<File> => {
    try {
      // Check file size (warn if very large - browser memory limits)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        console.warn(`Large file detected (${(file.size / 1024 / 1024).toFixed(2)}MB). Conversion may take a long time or fail due to memory constraints.`);
      }

      // Ensure FFmpeg is loaded
      if (!ffmpegRef.current || !ffmpegLoaded) {
        console.log('Loading FFmpeg...');
        toast.info("Loading Converter", { description: 'Initializing video converter...' });
        await loadFFmpeg();
      }

      const ffmpeg = ffmpegRef.current!;
      if (!ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }

      setConverting(true);
      console.log('Starting conversion for file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      const inputFileName = 'input.mkv';
      const outputFileName = 'output.mp4';

      // Write input file to FFmpeg
      console.log('Writing input file to FFmpeg...');
      const fileData = await fetchFile(file);
      await ffmpeg.writeFile(inputFileName, fileData);
      console.log('Input file written successfully');

      // Run conversion: -i input.mkv -c:v libx264 -c:a aac output.mp4
      console.log('Starting FFmpeg conversion...');
      
      // Add progress tracking
      let lastProgress = 0;
      ffmpeg.on('progress', ({ progress, time }) => {
        const progressPercent = Math.round(progress * 100);
        if (progressPercent !== lastProgress && progressPercent % 10 === 0) {
          console.log(`Conversion progress: ${progressPercent}%`);
          lastProgress = progressPercent;
        }
      });

      try {
        await ffmpeg.exec([
          '-i', inputFileName,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          '-y', // Overwrite output file if it exists
          outputFileName
        ]);
        console.log('FFmpeg conversion completed');
      } catch (execError) {
        // Check if output file exists despite error
        try {
          const files = await ffmpeg.listDir('/');
          console.log('Files in FFmpeg filesystem:', files);
        } catch (listError) {
          console.warn('Could not list files:', listError);
        }
        throw execError;
      }

      // Read output file
      console.log('Reading output file...');
      const data = await ffmpeg.readFile(outputFileName);
      
      if (!data || (data instanceof Uint8Array && data.length === 0)) {
        throw new Error('Conversion produced empty output file');
      }

      // Convert FileData to Blob-compatible format
      // FileData can be string or Uint8Array<ArrayBufferLike>
      let blob: Blob;
      if (typeof data === 'string') {
        // If it's a string, convert to blob
        blob = new Blob([data], { type: 'video/mp4' });
      } else {
        // If it's Uint8Array, create a new Uint8Array with ArrayBuffer
        const uint8Array = new Uint8Array(data);
        blob = new Blob([uint8Array.buffer], { type: 'video/mp4' });
      }
      console.log('Output blob created, size:', blob.size);

      // Clean up
      try {
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);
      } catch (cleanupError) {
        console.warn('Cleanup error (non-critical):', cleanupError);
      }

      // Create new File object with .mp4 extension
      const fileName = file.name.replace(/\.mkv$/i, '.mp4');
      const convertedFile = new File([blob], fileName, { type: 'video/mp4' });

      setConverting(false);
      console.log('Conversion successful!');
      return convertedFile;
    } catch (error) {
      setConverting(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
      console.error('Conversion error details:', error);
      throw new Error(`Failed to convert MKV to MP4: ${errorMessage}`);
    }
  };

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
      setLoading(true);
      
      // Check if file is MKV and convert to MP4
      let fileToUpload = file;
      if (file.name.toLowerCase().endsWith('.mkv')) {
        try {
          toast.info("Converting", { description: 'Converting MKV to MP4... This may take a while.' });
          // fileToUpload = await convertMkvToMp4(file);
          toast.success("Converted", { description: 'MKV file converted to MP4 successfully!' });
        } catch (conversionError) {
          console.error('Conversion failed:', conversionError);
          toast.warning("Conversion Failed", { 
            description: 'Failed to convert MKV file. Uploading original file instead.' 
          });
          return
        }
      }

      const duration = await getVideoDuration(fileToUpload);
      
      uploadMovie.mutate(
        { file: fileToUpload, duration },
        {
          onSuccess: async (data) => {
            console.log("Saving movie", data);
            await axios.post('/api/movies', {
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
              disabled={uploadMovie.isPending || converting || loading}
            >
              <span>
                <Upload className="size-4mr-2" />
                {converting ? 'Converting...' : uploadMovie.isPending ? 'Uploading...' : 'Upload'}
              </span>
            </Button>
            <Input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadMovie.isPending || converting || loading}
            />
          </label>
        </div>

        {/* Demo Movies */}
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

        {/* Uploaded Movies */}
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

        {/* Empty State */}
        {filteredMovies.length === 0 && (
          <Card className="p-8 bg-card border border-border text-center">
            <p className="text-muted-foreground">No movies found. Upload a movie to get started!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
