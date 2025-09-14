import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CoachesClient from "./CoachesClient";
import { generateMetadata, generatePlayerLD } from "@/components/SEO";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: 'Meet Our Coaches | Ponca City United FC',
  description: 'Meet the experienced coaching staff and volunteers at Ponca City United FC. Learn about our coaches\' backgrounds, experience, and coaching philosophy.',
  keywords: [
    'Ponca City United FC coaches',
    'soccer coaches',
    'youth soccer coaching staff',
    'football coaches Oklahoma',
    'soccer coaching experience',
    'youth development coaches',
    'soccer training staff',
    'coaching qualifications',
    'Oklahoma soccer coaches',
    'experienced soccer coaches'
  ],
  url: '/coaches',
});

export default function CoachesPage() {
  const coachingStaffLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Ponca City United FC Coaching Staff",
    "description": "Experienced coaching staff dedicated to youth soccer development",
    "url": "https://poncacityunited.com/coaches"
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(coachingStaffLD),
        }}
      />
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">Meet Our Coaches</h1>
            <p className="text-lg md:text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto px-4">
              Experienced professionals dedicated to developing young soccer talent
            </p>
          </div>
        </div>
      </section>

      <CoachesClient />
      
      <Footer />
    </div>
  );
}