import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, props: { params: Promise<{ partyId: string }> }) {
  const params = await props.params;
  try {
    const { partyId } = params;
    const { currentTime, isPlaying, currentMovieId } = await request.json();

    const party = await prisma.watchParty.update({
      where: { id: partyId },
      data: {
        currentTime: currentTime ?? undefined,
        isPlaying: isPlaying ?? undefined,
        currentMovieId: currentMovieId ?? undefined,
      },
    });

    return NextResponse.json(party);
  } catch (error) {
    console.error("[v0] Error updating playback state:", error);
    return NextResponse.json({ error: "Failed to update playback state" }, { status: 500 });
  }
}
