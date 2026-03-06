import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Provider from '@/components/Provider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'WatchParty - Watch Together',
  description: 'Watch movies together in real-time with friends. Create or join a party and enjoy synchronized playback.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <Provider>
        <body className="font-sans antialiased">
          {children}
          <Toaster richColors />
          <Analytics />
        </body>
      </Provider>
    </html>
  )
}
