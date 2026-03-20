'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

const loadFFmpeg = async () => {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  ffmpegLoadingPromise = (async () => {
    const ffmpeg = new FFmpeg();

    // Use UMD build for better compatibility across browsers.
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadingPromise;
};

// Converts an uploaded `.srt` file to `.vtt` using FFmpeg.
export async function convertSrtToVtt(srtFile: File): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();

  const inputName = 'subtitles.srt';
  const outputName = 'subtitles.vtt';

  return convertSrtBlobToVtt(ffmpeg, inputName, outputName, await fetchFile(srtFile));
}

async function convertSrtBlobToVtt(
  ffmpeg: FFmpeg,
  inputName: string,
  outputName: string,
  srtFileData: Parameters<FFmpeg['writeFile']>[1]
): Promise<Blob> {
  // Clean old files (if any).
  try {
    await ffmpeg.deleteFile(inputName);
  } catch {
    // ignore
  }
  try {
    await ffmpeg.deleteFile(outputName);
  } catch {
    // ignore
  }

  await ffmpeg.writeFile(inputName, srtFileData);
  await ffmpeg.exec(['-i', inputName, outputName]);

  const data = await ffmpeg.readFile(outputName);

  if (typeof data === 'string') {
    return new Blob([data], { type: 'text/vtt' });
  }

  // `data` is typically a Uint8Array, but the generic type can be `Uint8Array<ArrayBufferLike>`.
  // Blob accepts typed arrays at runtime; we cast to avoid a TS generic mismatch.
  return new Blob([data as any], { type: 'text/vtt' });
}

export async function convertSrtUrlToVtt(srtUrl: string): Promise<Blob> {
  const res = await fetch(srtUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch SRT: ${res.status} ${res.statusText}`);
  }

  const srtBlob = await res.blob();
  const ffmpeg = await loadFFmpeg();

  const inputName = 'subtitles.srt';
  const outputName = 'subtitles.vtt';

  return convertSrtBlobToVtt(ffmpeg, inputName, outputName, await fetchFile(srtBlob));
}

// Converts and immediately triggers a browser download for the generated `.vtt`.
export async function convertSrtToVttAndDownload(
  srtFile: File,
  outputFileName: string = 'subtitles.vtt'
): Promise<void> {
  const vttBlob = await convertSrtToVtt(srtFile);

  const url = URL.createObjectURL(vttBlob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Converts an SRT URL and immediately triggers a browser download for the generated `.vtt`.
export async function convertSrtUrlToVttAndDownload(
  srtUrl: string,
  outputFileName: string = 'subtitles.vtt'
): Promise<void> {
  const vttBlob = await convertSrtUrlToVtt(srtUrl);

  const url = URL.createObjectURL(vttBlob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName;
    a.click();
    console.log('Downloading subtitles:', url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

