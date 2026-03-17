import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ponca City United FC",
  description: "Official website of Ponca City United FC soccer team. Join our youth soccer program in Ponca City, Oklahoma.",
  metadataBase: new URL('https://poncacityunited.com'),
  openGraph: {
    title: 'Ponca City United FC',
    description: 'Official website of Ponca City United FC soccer team. Join our youth soccer program in Ponca City, Oklahoma.',
    url: '/',
    siteName: 'Ponca City United FC',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Ponca City United FC' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ponca City United FC',
    description: 'Official website of Ponca City United FC soccer team.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-team-blue focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
        <ToastProvider />
        <Analytics />
      </body>
    </html>
  );
}
