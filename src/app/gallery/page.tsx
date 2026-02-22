import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GalleryClient from "./GalleryClient";
import { generateMetadata } from "@/components/SEO";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: 'Photo Gallery - Ponca City United FC',
  description: 'Browse photos and highlights from Ponca City United FC games, tournaments, events, and team activities.',
  keywords: [
    'Ponca City United FC photos',
    'youth soccer photos Oklahoma',
    'soccer team gallery',
    'game highlights',
    'tournament photos',
  ],
  url: '/gallery',
});

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Photo <span className="text-team-red">Gallery</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Relive the best moments from our games, tournaments, and team events.
            </p>
          </div>
        </div>
      </section>

      <GalleryClient />

      <Footer />
    </div>
  );
}
