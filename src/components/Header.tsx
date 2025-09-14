'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-team-blue shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center cursor-pointer">
              <Image
                src="/logo.png"
                alt="Ponca City United FC Logo"
                width={40}
                height={40}
                sizes="40px"
                className="mr-3"
              />
              <span className="text-white font-bold text-xl">Ponca City United FC</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Home
            </Link>
            <Link href="/about" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              About
            </Link>
            <Link href="/players" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Players
            </Link>
            <Link href="/coaches" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Coaches
            </Link>
            <Link href="/team" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Team
            </Link>
            <Link href="/register" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Register
            </Link>
            <Link href="/contact" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Contact
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-team-red focus:outline-none focus:text-team-red"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-team-blue border-t border-blue-700">
              <Link href="/" className="block px-3 py-2 text-white hover:text-team-red transition duration-300" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
              <Link href="/about" className="block px-3 py-2 text-white hover:text-team-red transition duration-300" onClick={() => setIsMenuOpen(false)}>
                About
              </Link>
              <Link href="/players" className="block px-3 py-2 text-white hover:text-team-red transition duration-300" onClick={() => setIsMenuOpen(false)}>
                Players
              </Link>
              <Link href="/coaches" className="block px-3 py-2 text-white hover:text-team-red transition duration-300" onClick={() => setIsMenuOpen(false)}>
                Coaches
              </Link>
              <Link href="/team" className="block px-3 py-2 text-white hover:text-team-red transition duration-300" onClick={() => setIsMenuOpen(false)}>
                Team
              </Link>
              <Link href="/register" className="block px-3 py-2 text-white hover:text-team-red transition duration-300" onClick={() => setIsMenuOpen(false)}>
                Register
              </Link>
              <Link href="/contact" className="block px-3 py-2 text-white hover:text-team-red transition duration-300" onClick={() => setIsMenuOpen(false)}>
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}