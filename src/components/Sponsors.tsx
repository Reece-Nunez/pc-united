import Image from "next/image";
import AnimateOnScroll from './AnimateOnScroll';
import { getSponsorships } from '@/lib/supabase';

/** Seconds each logo takes to cross the screen. Total duration scales with the
 *  sponsor count so the marquee keeps a constant pace as sponsors are added. */
const SECONDS_PER_SPONSOR = 5;

/** Minimum logos in one half of the track. With only a handful of sponsors a
 *  single pass is narrower than the viewport, which would leave a visible gap
 *  at the loop seam — so the list repeats until it's wide enough to fill. */
const MIN_ITEMS_PER_HALF = 8;

export default async function Sponsors() {
  const { data: sponsorships } = await getSponsorships();

  // Show approved/completed sponsors that have a logo
  const sponsors = (sponsorships || []).filter(
    (s) => (s.status === 'approved' || s.status === 'completed') && s.logo_url
  );

  if (sponsors.length === 0) return null;

  const repeats = Math.max(1, Math.ceil(MIN_ITEMS_PER_HALF / sponsors.length));
  const half = Array.from({ length: repeats }, () => sponsors).flat();
  const duration = `${half.length * SECONDS_PER_SPONSOR}s`;

  // The two halves must be pixel-for-pixel the same width for translateX(-50%)
  // to land exactly on the second half's first logo. `pr-12` supplies the gap
  // that would otherwise sit *between* the halves and skew that math.
  const halfClass = 'flex shrink-0 items-center gap-12 pr-12';

  const renderHalf = (copy: 'a' | 'b') =>
    half.map((sponsor, i) => (
      <div
        key={`${copy}-${i}-${sponsor.id}`}
        className="group flex shrink-0 flex-col items-center gap-3"
      >
        <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-center w-48 h-48 group-hover:shadow-xl transition-shadow duration-200">
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
    ));

  return (
    <section id="sponsors" className="py-16 bg-gray-50 overflow-hidden">
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

        {/* The marquee itself is aria-hidden (it repeats each logo), so screen
            readers get the sponsor list once, in order, here. */}
        <p className="sr-only">
          Sponsors: {sponsors.map((s) => s.business_name).join(', ')}
        </p>
      </div>

      <AnimateOnScroll variant="fadeIn" delay={0.2}>
        {/* Full-bleed so the logos run edge to edge across the screen. */}
        <div
          className="sponsor-marquee relative w-full overflow-hidden py-2"
          aria-hidden="true"
        >
          <div
            className="sponsor-marquee-track flex w-max items-center"
            style={{ '--marquee-duration': duration } as React.CSSProperties}
          >
            <div className={halfClass}>{renderHalf('a')}</div>
            <div className={`sponsor-marquee-clone ${halfClass}`}>
              {renderHalf('b')}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  );
}
