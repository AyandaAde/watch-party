
import { env } from '@/env';
import { mux } from '@/lib/mux';
import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { assetId } = await req.json();

    try {
 
        const video = await mux.video.assets.retrieve(assetId);

        // if(video.playback_ids && video.playback_ids.length > 0)  return new NextResponse(JSON.stringify(`https://stream.mux.com/${video.playback_ids[0]}.m3u8`), { status: 200 });

        return new NextResponse(JSON.stringify({ playbackId: video.playback_ids?.[0] }), { status: 200 });

    } catch (error) {
        console.error('Error creating stream video:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to create stream video' }), { status: 500 });
    }
}