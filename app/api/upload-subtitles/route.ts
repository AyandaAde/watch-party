import { mux } from "@/lib/mux";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const {assetId, url} = await request.json();

    try {

        // await mux.video.assets.deleteTrack(assetId, 'dA5hAL00NllaUGAIxi9gXXf45UTEus901zJMNd5KK02lpb84q8VLwJXOQ');

        await mux.video.assets.createTrack(assetId, {
            url,
            type: 'text',
            text_type: 'subtitles',
            language_code: 'en',
            name: 'English2',
        });

        return new NextResponse(JSON.stringify({ message: 'Subtitles successfully uploaded' }), { status: 200 });
    } catch (error) {
        console.error('Error uploading subtitles:', error);
        return new NextResponse(JSON.stringify(error), { status: 500 });
    }
} 