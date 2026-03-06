import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, createdBy, username } = await request.json();

    const party = await prisma.watchParty.create({
      data: {
        name,
        createdBy,
        members: {
          create: {
            userId: createdBy,
            username,
            isActive: true,
          },
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json(party);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[v0] Error creating party:", errorMessage);
    console.error("[v0] Full error:", error);
    return NextResponse.json({ 
      error: "Failed to create party",
      details: errorMessage 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partyId = searchParams.get("id");

    if (!partyId) {
      return NextResponse.json({ error: "Party ID required" }, { status: 400 });
    }

    const party = await prisma.watchParty.findUnique({
      where: { id: partyId },
      include: {
        members: true,
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    return NextResponse.json(party);
  } catch (error) {
    console.error("[v0] Error fetching party:", error);
    return NextResponse.json({ error: "Failed to fetch party" }, { status: 500 });
  }
}
