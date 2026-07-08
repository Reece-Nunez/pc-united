import Image from "next/image";
import Link from "next/link";
import AnimateOnScroll from './AnimateOnScroll';

export default function Hero() {
  return (
    <section id="main-content" className="relative bg-team-blue text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <AnimateOnScroll variant="fadeInUp" duration={0.6}>
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-white/70 mb-6">
              <span className="h-px w-8 bg-team-red" aria-hidden />
              U11 &amp; U12 · Ponca City, Oklahoma
            </p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[0.95] uppercase">
              Join Ponca City{' '}
              <span className="text-team-red">United FC</span>
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
