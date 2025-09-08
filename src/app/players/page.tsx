import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlayersClient from "./PlayersClient";
import { playersMetadata } from "./metadata";
import { generateSportsTeamLD } from "@/components/SEO";
import { Metadata } from "next";

export const metadata: Metadata = playersMetadata;

export default function PlayersPage() {
  const teamLD = generateSportsTeamLD("Ponca City United FC Players", "Meet our talented roster of young soccer players");

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(teamLD),
        }}
      />
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">
              Our <span className="text-team-red">Players</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto px-4">
              Meet the talented young athletes of our teams - building their soccer careers one game at a time.
            </p>
          </div>
        </div>
      </section>

      <PlayersClient />
      
      <Footer />
    </div>
  );
}