import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RegisterClient from "./RegisterClient";
import { generateMetadata } from "@/components/SEO";
import { Metadata } from "next";

export const metadata: Metadata = generateMetadata({
  title: 'Player Registration - Join Ponca City United FC',
  description: 'Register your child for Ponca City United FC youth soccer program. Easy online registration for all ages and skill levels. Professional coaching and competitive teams in Oklahoma.',
  keywords: [
    'soccer registration Ponca City',
    'youth soccer sign up',
    'Ponca City United FC registration',
    'kids soccer Oklahoma',
    'soccer team registration',
    'youth sports registration',
    'soccer club enrollment',
    'competitive soccer registration',
    'Oklahoma youth soccer',
    'soccer player registration'
  ],
  url: '/register',
});

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">
              Join Our <span className="text-team-red">Team</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto px-4">
              Register your child for Ponca City United FC and start their soccer journey with professional coaching and competitive play.
            </p>
          </div>
        </div>
      </section>

      {/* Registration Benefits */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-4">Why Choose Ponca City United FC?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-team-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">⚽</span>
              </div>
              <h3 className="text-lg font-semibold text-team-blue mb-2">Professional Coaching</h3>
              <p className="text-gray-600 text-sm md:text-base">Experienced coaches focused on skill development and fun</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-team-red rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🏆</span>
              </div>
              <h3 className="text-lg font-semibold text-team-blue mb-2">Competitive Play</h3>
              <p className="text-gray-600 text-sm md:text-base">Local and regional tournaments for all skill levels</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-team-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-team-blue mb-2">Team Spirit</h3>
              <p className="text-gray-600 text-sm md:text-base">Building friendships and character through teamwork</p>
            </div>
          </div>
        </div>
      </section>

      <RegisterClient />
      
      <Footer />
    </div>
  );
}