import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sponsors from "@/components/Sponsors";
import Link from "next/link";
import { generateMetadata } from "@/components/SEO";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: 'Friends & Sponsors - Ponca City United FC',
  description: 'Meet the friends, partners, and sponsors who support Ponca City United FC. Learn how you can partner with our youth soccer program in Oklahoma.',
  keywords: [
    'Ponca City United FC sponsors',
    'youth soccer sponsors Oklahoma',
    'soccer team partners',
    'Ponca City soccer supporters',
    'community soccer sponsors',
  ],
  url: '/friends',
});

export default function FriendsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Friends of <span className="text-team-red">the Team</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              We're grateful for the partners and sponsors who believe in our mission and help make Ponca City United FC possible.
            </p>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <Sponsors />

      {/* Become a Sponsor */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Become a Friend</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Interested in supporting youth soccer in Ponca City? We'd love to have you on board.
            Your partnership helps provide quality coaching, equipment, and opportunities for our young athletes.
          </p>
          <Link
            href="/contact"
            className="bg-team-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 cursor-pointer"
          >
            Get In Touch
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
