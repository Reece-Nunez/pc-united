'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/players', label: 'Players' },
  { href: '/coaches', label: 'Coaches' },
  { href: '/team', label: 'Team' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/friends', label: 'Friends' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogoTap = (e: React.MouseEvent) => {
    e.preventDefault();
    tapCountRef.current += 1;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1000);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      router.push('/admin');
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-team-blue/85 backdrop-blur-lg shadow-lg border-b border-white/10'
          : 'bg-team-blue'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${
          scrolled ? 'h-16' : 'h-20'
        }`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50" onClick={handleLogoTap}>
            <Image
              src="/logo.png"
              alt="Ponca City United FC Logo"
              width={48}
              height={48}
              sizes="48px"
              className={`transition-all duration-300 ${scrolled ? 'w-9 h-9' : 'w-12 h-12'}`}
            />
            <span className="text-white font-bold text-lg sm:text-xl tracking-tight">
              Ponca City <span className="text-team-red">United</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  isActive(href)
                    ? 'text-white'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {label}
                {/* Active indicator */}
                {isActive(href) && (
                  <motion.span
                    layoutId="activeNav"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-team-red rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {/* Hover underline */}
                {!isActive(href) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-team-red/60 rounded-full transition-all duration-200 group-hover:w-0 hover:w-5" />
                )}
              </Link>
            ))}

            {/* Login */}
            <Link
              href="/admin/login"
              className={`ml-4 font-semibold text-sm rounded-full transition-all duration-300 ${
                pathname === '/admin/login'
                  ? 'bg-white text-team-blue px-5 py-2'
                  : 'border border-white/40 text-white hover:bg-white/10 px-5 py-2'
              }`}
            >
              Login
            </Link>

            {/* Register CTA */}
            <Link
              href="/register"
              className={`font-semibold text-sm rounded-full transition-all duration-300 ${
                pathname === '/register'
                  ? 'bg-white text-team-blue px-5 py-2'
                  : 'bg-team-red hover:bg-red-600 text-white px-5 py-2 hover:shadow-lg hover:shadow-red-500/25'
              }`}
            >
              Register
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden relative w-11 h-11 flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <div className="w-6 h-5 relative flex flex-col justify-between">
              <span
                className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 origin-center ${
                  isMenuOpen ? 'rotate-45 translate-y-[9px]' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 ${
                  isMenuOpen ? 'opacity-0 scale-x-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 origin-center ${
                  isMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            role="navigation"
            aria-label="Mobile navigation"
            className="lg:hidden overflow-hidden bg-team-blue/95 backdrop-blur-lg border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(href)
                      ? 'bg-white/10 text-white border-l-2 border-team-red'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/admin/login"
                className="block mt-3 text-center border border-white/40 text-white hover:bg-white/10 font-semibold py-3 rounded-lg transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block mt-2 text-center bg-team-red hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Register Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
