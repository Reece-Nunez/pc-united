import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-team-blue text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Image
                src="/logo.png"
                alt="Ponca City United FC Logo"
                width={32}
                height={32}
                className="mr-3"
              />
              <span className="font-bold text-lg">Ponca City United FC</span>
            </div>
            <p className="text-blue-100">
              Developing young athletes through quality soccer training and sportsmanship.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-blue-100">
              <li><Link href="/" className="hover:text-white transition duration-300 cursor-pointer">Home</Link></li>
              <li><Link href="/about" className="hover:text-white transition duration-300 cursor-pointer">About</Link></li>
              <li><Link href="/players" className="hover:text-white transition duration-300 cursor-pointer">Players</Link></li>
              <li><Link href="/register" className="hover:text-white transition duration-300 cursor-pointer">Register</Link></li>
              <li><Link href="/contact" className="hover:text-white transition duration-300 cursor-pointer">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-blue-100 hover:text-white transition duration-300 cursor-pointer">Facebook</a>
              <a href="#" className="text-blue-100 hover:text-white transition duration-300 cursor-pointer">Instagram</a>
              <a href="#" className="text-blue-100 hover:text-white transition duration-300 cursor-pointer">Twitter</a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-100">
          <p>&copy; 2024 Ponca City United FC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}