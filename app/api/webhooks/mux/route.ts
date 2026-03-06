import { env } from '@/env';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const MUX_WEBHOOK_SECRET = env.MUX_WEBHOOK_SECRET || 'my secret';

function verifyMuxSignature(
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', MUX_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    
    // Get Mux signature header
    const muxSignature = request.headers.get('mux-signature');
    
    if (!muxSignature) {
      console.error('[Mux Webhook] No signature provided');
      return NextResponse.json({ error: 'No signature provided' }, { status: 401 });
    }

    // Parse the signature header (format: t=timestamp,v1=signature)
    const signatureParts = muxSignature.split(',');
    const timestamp = signatureParts.find(part => part.startsWith('t='))?.split('=')[1];
    const signature = signatureParts.find(part => part.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !signature) {
      console.error('[Mux Webhook] Invalid signature format');
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 });
    }

    // Verify the signature
    const isValid = verifyMuxSignature(timestamp, rawBody, signature);

    if (!isValid) {
      console.error('[Mux Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook payload
    const event = JSON.parse(rawBody);
    console.log('[Mux Webhook] Received event:', event.type);

    // Handle video.asset.ready event
    if (event.type === 'video.asset.ready') {
      const { id: assetId, playback_ids, duration } = event.data;
      const playbackId = playback_ids?.[0]?.id;

      console.log('[Mux Webhook] Asset ready:', { assetId, playbackId, duration });

      if (assetId && playbackId) {
        // First find the movie to get its details
        const movie = await prisma.movie.findFirst({
          where: { assetId },
        });

        // Update the movie with the playbackId
        const updateResult = await prisma.movie.updateMany({
          where: { assetId },
          data: { 
            playbackId,
            duration: duration || 0,
          },
        });

        if (movie && updateResult.count > 0) {
          const transporter = nodemailer.createTransport({
            host: "securemail.webnames.ca",
            port: 465,
            secure: true,
            auth: {
              user: env.EMAIL_USER,
              pass: env.EMAIL_PASSWORD
            },
            tls: {
              rejectUnauthorized: false,
            },
          });

          const mailOptions = {
            from: `Watch Party <${env.EMAIL_USER}>`,
            to: `ayandakay67@gmail.com`,
            subject: `New Watch Party Video Upload Complete`,
            replyTo: env.EMAIL_USER,
            html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F5F8FA; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      
            <!-- Header -->
            <div style="background-color: #1A237E; color: white; padding: 24px; text-align: left;">
              <h2 style="margin: 0; font-size: 22px; font-weight: 600;">New Watch Party Video Upload Complete 🎥</h2>
            </div>
      
            <!-- Body -->
            <div style="padding: 24px; text-align: left;">
              <p style="font-size: 15px; margin: 0 0 12px;">
                Your video has finished processing and is now ready for playback.
              </p>
      
              <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; color: #333;">
                <tr style="border-bottom: 1px solid #E0E0E0;">
                  <td style="padding: 8px 0; color: #555;"><strong>Title:</strong></td>
                  <td style="padding: 8px 0;">${movie.title}</td>
                </tr>
                <tr style="border-bottom: 1px solid #E0E0E0;">
                  <td style="padding: 8px 0; color: #555;"><strong>Duration:</strong></td>
                  <td style="padding: 8px 0;">${Math.floor((duration || 0) / 60)}m ${Math.floor((duration || 0) % 60)}s</td>
                </tr>
                <tr style="border-bottom: 1px solid #E0E0E0;">
                  <td style="padding: 8px 0; color: #555;"><strong>Date:</strong></td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</td>
                </tr>
              </table>
            </div>
      
            <!-- Divider -->
            <div style="height: 1px; background: #E8EAF6;"></div>
      
            <!-- Footer -->
            <div style="padding: 18px; background: #F0F2F7; text-align: center; font-size: 13px; color: #666;">
              <p style="margin-top: 8px;">
                © ${new Date().getFullYear()} 
                <a href="https://watch-party.com" style="color:#1A237E; text-decoration:none;">
                  <strong>Watch Party</strong>
                </a>. All rights reserved.
              </p>
            </div>
          </div>
        </div>
        `,
          };
      
          await transporter.sendMail(mailOptions);
          console.log('[Mux Webhook] Email sent for movie:', movie.title);
        }

        console.log('[Mux Webhook] Updated movie count:', updateResult.count);
      }
    }

    // Handle video.asset.created event (optional logging)
    if (event.type === 'video.asset.created') {
      console.log('[Mux Webhook] Asset created:', event.data.id);
    }

    // Handle video.asset.errored event
    if (event.type === 'video.asset.errored') {
      console.error('[Mux Webhook] Asset error:', event.data);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Mux Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
