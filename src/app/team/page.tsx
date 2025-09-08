import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeamClient from "./TeamClient";
import { generateMetadata, generateSportsTeamLD } from "@/components/SEO";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: 'Team Central - News, Schedule & Events | Ponca City United FC',
  description: 'Stay up to date with Ponca City United FC team news, game schedules, upcoming events, and team statistics. View match results, announcements, and team performance.',
  keywords: [
    'Ponca City United FC team',
    'soccer team news',
    'game schedule',
    'soccer events',
    'team announcements',
    'match results',
    'team statistics',
    'youth soccer schedule',
    'Oklahoma soccer news',
    'soccer team calendar'
  ],
  url: '/team',
});

export default function TeamPage() {
  const teamLD = generateSportsTeamLD("Ponca City United FC", "Premier youth soccer club with comprehensive team information, schedules, and news");

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
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">Team Central</h1>
            <p className="text-lg md:text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto px-4">
              Stay up to date with the latest news, events, schedules, and team performance
            </p>
          </div>
        </div>
      </section>

      <TeamClient />
      
      <Footer />
    </div>
  );
}