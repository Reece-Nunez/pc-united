import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-20">
        <div className="max-w-lg mx-auto px-4 text-center">
          <Image
            src="/logo.png"
            alt="Ponca City United FC"
            width={120}
            height={120}
            className="mx-auto mb-8 opacity-30"
          />
          <h1 className="text-6xl font-bold text-team-blue mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-2">Page Not Found</p>
          <p className="text-gray-500 mb-8">
            Looks like this play went out of bounds. The page you're looking for doesn't exist.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="bg-team-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Back to Home
            </Link>
            <Link
              href="/players"
              className="border-2 border-team-blue text-team-blue hover:bg-team-blue hover:text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              View Players
            </Link>
            <Link
              href="/contact"
              className="border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
