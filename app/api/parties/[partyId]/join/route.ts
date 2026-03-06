import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, props: { params: Promise<{ partyId: string }> }) {
  const params = await props.params;
  try {
    const { userId, username } = await request.json();
    const { partyId } = params;

    // Check if party exists
    const party = await prisma.watchParty.findUnique({
      where: { id: partyId },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    // Check if user already in party
    const existingMember = await prisma.partyMember.findFirst({
      where: {
        partyId,
        userId,
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User already in party" }, { status: 400 });
    }

    // Add user to party
    const member = await prisma.partyMember.create({
      data: {
        partyId,
        userId,
        username,
        isActive: true,
      },
    });

    const updatedParty = await prisma.watchParty.findUnique({
      where: { id: partyId },
      include: { members: true },
    });

    return NextResponse.json(updatedParty);
  } catch (error) {
    console.error("[v0] Error joining party:", error);
    return NextResponse.json({ error: "Failed to join party" }, { status: 500 });
  }
}
