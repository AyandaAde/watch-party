import { mux } from "@/lib/mux";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(movies);
  } catch (error) {
    console.error("[v0] Error fetching movies:", error);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, blobUrl, duration, uploadedBy, size, isDemo } = await request.json();

    const asset = await mux.video.assets.create({
      inputs: [{ url: blobUrl }],
      playback_policies: ['public'],
      video_quality: 'premium',
      normalize_audio: true,
  });

  const movie = await prisma.movie.create({
    data: {
      title,
      blobUrl,
      assetId: asset.id,
      duration: parseFloat(duration),
      uploadedBy,
      size: parseInt(size),
      isDemo: isDemo || false,
    },
  });


    return NextResponse.json(movie);
  } catch (error) {
    console.error("[v0] Error creating movie:", error);
    return NextResponse.json({ error: "Failed to create movie" }, { status: 500 });
  }
}
