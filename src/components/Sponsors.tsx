import Image from "next/image";
import Link from "next/link";
import AnimateOnScroll from './AnimateOnScroll';

const sponsors = [
  {
    name: "NunezDev",
    logo: "/sponsors/nunezdev/n-logo.svg",
    url: "https://nunezdev.com",
  },
];

export default function Sponsors() {
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
              <Link
                key={sponsor.name}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 transition duration-300 hover:scale-105"
              >
                <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-center w-48 h-48 group-hover:shadow-lg transition duration-300">
                  <Image
                    src={sponsor.logo}
                    alt={sponsor.name}
                    width={140}
                    height={140}
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-500 group-hover:text-team-blue transition duration-300">
                  {sponsor.name}
                </span>
              </Link>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
