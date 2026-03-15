import Link from "next/link";
import Image from "next/image";
import AnimateOnScroll from './AnimateOnScroll';
import { getSponsorships } from '@/lib/supabase';

export default async function Sponsors() {
  const { data: sponsorships } = await getSponsorships();

  // Show approved/completed sponsors that have a logo
  const sponsors = (sponsorships || []).filter(
    (s) => (s.status === 'approved' || s.status === 'completed') && s.logo_url
  );

  if (sponsors.length === 0) return null;

  return (
    <section id="sponsors" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll variant="fadeInUp">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">
              Friends of the Team
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We appreciate the partners and sponsors who help make Ponca City
              United FC possible.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll variant="fadeIn" delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="group flex flex-col items-center gap-3 transition duration-300 hover:scale-105"
              >
                <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-center w-48 h-48 group-hover:shadow-lg transition duration-300">
                  <Image
                    src={sponsor.logo_url!}
                    alt={sponsor.business_name}
                    width={140}
                    height={140}
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-500 group-hover:text-team-blue transition duration-300">
                  {sponsor.business_name}
                </span>
              </div>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
