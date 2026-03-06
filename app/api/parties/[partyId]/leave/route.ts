import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, props: { params: Promise<{ partyId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await request.json();
    const { partyId } = params;

    // Remove user from party
    await prisma.partyMember.deleteMany({
      where: {
        partyId,
        userId,
      },
    });

    // Check if any members left
    const remainingMembers = await prisma.partyMember.count({
      where: { partyId },
    });

    // If no members left, deactivate party
    if (remainingMembers === 0) {
      await prisma.watchParty.update({
        where: { id: partyId },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Error leaving party:", error);
    return NextResponse.json({ error: "Failed to leave party" }, { status: 500 });
  }
}
