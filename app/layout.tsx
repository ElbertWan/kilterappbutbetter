import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { BleProvider } from '@/components/ble-provider';
import { BoardProvider } from '@/components/board-provider';
import { BottomNav } from '@/components/bottom-nav';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'Kilter Board Climbs',
  description: 'Browse and light up Kilter Board climbing routes',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-white">
        <BoardProvider>
          <BleProvider>
            <main className="flex-1 pb-20">
              {children}
            </main>
            <BottomNav />
          </BleProvider>
        </BoardProvider>
      </body>
    </html>
  );
}
