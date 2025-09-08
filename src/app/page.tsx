import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Registration from "@/components/Registration";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { generateMetadata, generateSportsOrganizationLD } from "@/components/SEO";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: 'Ponca City United FC - Premier Youth Soccer Club in Oklahoma',
  description: 'Join Ponca City United FC, the premier youth soccer club in Ponca City, Oklahoma. Professional coaching, competitive teams, and comprehensive player development programs for all ages and skill levels.',
  keywords: [
    'Ponca City United FC',
    'youth soccer Oklahoma',
    'Ponca City soccer club',
    'youth football club',
    'soccer training Ponca City',
    'competitive youth soccer',
    'Oklahoma soccer teams',
    'soccer registration Ponca City',
    'youth sports Oklahoma',
    'soccer coaching',
    'player development'
  ],
  url: '/',
});

export default function Home() {
  const organizationLD = generateSportsOrganizationLD();

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationLD),
        }}
      />
      <Header />
      <Hero />
      <About />
      <Registration />
      <Contact />
      <Footer />
    </div>
  );
}
