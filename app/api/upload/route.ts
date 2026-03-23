import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  console.log('body', body);

  // Get token from environment - prefer server-side token
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_NETFLIX_PARTY_READ_WRITE_TOKEN;
  
  if (!token) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is not configured' },
      { status: 500 },
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      token: token,
      request,
      onBeforeGenerateToken: async (
        pathname,
        clientPayload,
      ) => {
        // Extract metadata from client payload if provided
        const metadata = clientPayload ? JSON.parse(clientPayload as string) : {};
        
        return {
          allowedContentTypes: ['video/mp4', 'video/mpeg', 'video/quicktime', "video/webm", "video/mov", "video/mkv", "video/x-matroska"],
          addRandomSuffix: true,
          callbackUrl: `${process.env.VERCEL_BLOB_CALLBACK_URL}/api/upload?vercel-blob-callback=true`,
          tokenPayload: JSON.stringify({
            title: metadata.title || pathname,
            duration: metadata.duration || 0,
            uploadedBy: metadata.uploadedBy || 'anonymous',
            size: metadata.size || 0,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('blob upload completed', blob, tokenPayload);

        try {
          
        } catch (error) {
          console.error('Error saving movie to database:', error);
          // Don't throw error here to avoid retrying the upload
        }
      },
    });
    
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}