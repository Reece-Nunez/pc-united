import Image from "next/image";
import Link from "next/link";
import AnimateOnScroll from './AnimateOnScroll';

export default function Hero() {
  return (
    <section id="main-content" className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <AnimateOnScroll variant="fadeInUp" duration={0.6}>
            <p className="inline-block text-sm font-semibold tracking-wider uppercase text-team-red bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              U10 Developmental Team — Ponca City, OK
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight">
              Join Ponca City{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-team-red to-red-400">
                United FC
              </span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-blue-200 leading-relaxed max-w-lg">
              Developing young athletes through quality soccer training, teamwork, and sportsmanship in Ponca City, Oklahoma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="bg-team-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Register Now
              </Link>
              <Link
                href="/about"
                className="border-2 border-white text-white hover:bg-white hover:text-team-blue font-bold py-3 px-8 rounded-lg transition-colors duration-200 cursor-pointer text-center focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Learn More
              </Link>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll variant="fadeIn" delay={0.3} duration={0.8} className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Ponca City United FC Logo"
              width={300}
              height={300}
              sizes="(max-width: 768px) 200px, 300px"
              loading="eager"
              priority
              className="drop-shadow-2xl"
            />
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
