
import { env } from '@/env';
import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { blobUrl } = await req.json();
    console.log('blobUrl', blobUrl);
    const mux = new Mux({
        tokenId: env.WATCH_PARTY_MUX_TOKEN_ID,
        tokenSecret: env.WATCH_PARTY_MUX_TOKEN_SECRET
    });

    try {
        const asset = await mux.video.assets.create({
            inputs: [{ url: blobUrl }],
            playback_policies: ['public'],
            video_quality: 'premium',
            normalize_audio: true,
        });

        const video = await mux.video.assets.retrieve(asset.id);

        // if(video.playback_ids && video.playback_ids.length > 0)  return new NextResponse(JSON.stringify(`https://stream.mux.com/${video.playback_ids[0]}.m3u8`), { status: 200 });

        console.log('asset', video);
        return new NextResponse(JSON.stringify({ assetId: asset.id, playbackId: asset.playback_ids?.[0] }), { status: 200 });

    } catch (error) {
        console.error('Error creating stream video:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to create stream video' }), { status: 500 });
    }
}