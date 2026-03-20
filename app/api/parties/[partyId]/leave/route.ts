import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, props: { params: Promise<{ partyId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await request.json();
    const { partyId } = params;

    await prisma.partyMember.deleteMany({
      where: {
        partyId,
        userId,
      },
    });
    
    const remainingMembers = await prisma.partyMember.count({
      where: { partyId },
    });

    if (remainingMembers === 0) {
      await prisma.watchParty.update({
        where: { id: partyId },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving party:", error);
    return NextResponse.json({ error: "Failed to leave party" }, { status: 500 });
  }
}
