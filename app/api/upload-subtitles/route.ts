import { mux } from "@/lib/mux";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const {assetId, url} = await request.json();
    console.log('assetId', assetId);

    try {
        await mux.video.assets.createTrack(assetId, {
            url: 'https://bwmmuzylky4hiheu.public.blob.vercel-storage.com/subtitles.vtt',
            type: 'text',
            text_type: 'subtitles',
            language_code: 'en',
            name: 'English',
        });

        return new NextResponse(JSON.stringify({ message: 'Subtitles successfully uploaded' }), { status: 200 });
    } catch (error) {
        console.error('Error uploading subtitles:', error);
        return new NextResponse(JSON.stringify(error), { status: 500 });
    }
} 