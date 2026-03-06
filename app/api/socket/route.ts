import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// This is a placeholder for Socket.io initialization
// In a real deployment, Socket.io should be initialized through a custom server
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Socket.io server is running',
    status: 'active',
  });
}
