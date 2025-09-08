import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <nav className="bg-team-blue shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center cursor-pointer">
              <Image
                src="/logo.png"
                alt="Ponca City United FC Logo"
                width={40}
                height={40}
                className="mr-3"
              />
              <span className="text-white font-bold text-xl">Ponca City United FC</span>
            </Link>
          </div>
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
            <Link href="/register" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Register
            </Link>
            <Link href="/contact" className="text-white hover:text-team-red transition duration-300 cursor-pointer">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}