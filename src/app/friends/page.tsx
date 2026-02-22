import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sponsors from "@/components/Sponsors";
import SponsorshipForm from "./SponsorshipForm";
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
    'youth soccer sponsorship',
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

      {/* Current Sponsors */}
      <Sponsors />

      {/* Sponsorship Levels Info */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Sponsorship Levels</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Sponsorship funds go directly toward tournament fees, travel costs, training equipment, and financial help for families that need it.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4 border-gray-400">
              <h3 className="text-xl font-bold text-team-blue mb-1">Platinum</h3>
              <p className="text-2xl font-bold text-team-red mb-3">$2,500</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>Logo on front of alternate jersey</li>
                <li>Featured spot on website</li>
                <li>Regular social media highlights</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4 border-yellow-500">
              <h3 className="text-xl font-bold text-team-blue mb-1">Gold</h3>
              <p className="text-2xl font-bold text-team-red mb-3">$1,000</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>Logo on back of alternate jersey or training shirts</li>
                <li>Logo on website</li>
                <li>Several social shoutouts</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4 border-gray-300">
              <h3 className="text-xl font-bold text-team-blue mb-1">Silver</h3>
              <p className="text-2xl font-bold text-team-red mb-3">$500</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>Logo on website</li>
                <li>Thank You Sponsors banner mention</li>
                <li>A couple social shoutouts</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-lg border-t-4 border-orange-400">
              <h3 className="text-xl font-bold text-team-blue mb-1">Bronze / Friends</h3>
              <p className="text-2xl font-bold text-team-red mb-3">$250</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>Business name on website</li>
                <li>One social media thank-you</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            Want to help at a different amount? We'll gladly work with you.
          </p>
        </div>
      </section>

      {/* Sponsorship Form */}
      <SponsorshipForm />

      <Footer />
    </div>
  );
}
