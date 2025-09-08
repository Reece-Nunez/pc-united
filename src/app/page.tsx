import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="bg-pcuf-blue shadow-lg">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Ponca City United FC Logo"
                width={60}
                height={60}
                className="mr-3"
              />
              <div className="text-white">
                <h1 className="text-xl font-bold">Ponca City United FC</h1>
                <p className="text-blue-100 text-sm">Youth Soccer Excellence</p>
              </div>
            </div>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-white hover:text-blue-200 font-medium">
                Home
              </Link>
              <Link href="/teams" className="text-white hover:text-blue-200 font-medium">
                Teams
              </Link>
              <Link href="/schedule" className="text-white hover:text-blue-200 font-medium">
                Schedule
              </Link>
              <Link href="/about" className="text-white hover:text-blue-200 font-medium">
                About
              </Link>
              <Link href="/contact" className="text-white hover:text-blue-200 font-medium">
                Contact
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative bg-pcuf-blue text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to Ponca City United FC
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Building champions on and off the field
            </p>
            <div className="space-x-4">
              <Link
                href="/register"
                className="bg-pcuf-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
              >
                Register Now
              </Link>
              <Link
                href="/about"
                className="border-2 border-white hover:bg-white hover:text-pcuf-blue text-white font-bold py-3 px-8 rounded-lg transition duration-300"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            className="w-full h-16 text-white"
            fill="currentColor"
            viewBox="0 0 1440 320"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m0,96l48,32c48,32 144,96 240,106.7c96,10.3 192,-21.7 288,-32c96,-10.3 192,0 288,21.3c96,21.7 192,64 240,85.3l48,21.3l0,192l-1440,0l0,-192z" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-pcuf-blue mb-4">
              Why Choose PCUFC?
            </h2>
            <p className="text-lg text-gray-600">
              We're committed to developing skilled players and strong character
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-white shadow-lg">
              <div className="w-16 h-16 bg-pcuf-red rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-pcuf-blue mb-2">Expert Coaching</h3>
              <p className="text-gray-600">
                Our certified coaches bring years of experience and passion to develop each player's potential.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg bg-white shadow-lg">
              <div className="w-16 h-16 bg-pcuf-orange rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-pcuf-blue mb-2">Team Spirit</h3>
              <p className="text-gray-600">
                We foster teamwork, sportsmanship, and lifelong friendships through soccer.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg bg-white shadow-lg">
              <div className="w-16 h-16 bg-pcuf-blue rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-pcuf-blue mb-2">Community Focus</h3>
              <p className="text-gray-600">
                We're proud to be part of the Ponca City community and support local youth development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-pcuf-blue text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join the Team?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Registration for the upcoming season is now open!
          </p>
          <Link
            href="/register"
            className="bg-pcuf-red hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition duration-300"
          >
            Register Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src="/logo.png"
                  alt="Ponca City United FC Logo"
                  width={40}
                  height={40}
                  className="mr-3"
                />
                <h3 className="text-lg font-bold">Ponca City United FC</h3>
              </div>
              <p className="text-gray-400">
                Developing young athletes through competitive soccer in Ponca City, Oklahoma.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/teams" className="text-gray-400 hover:text-white">Teams</Link></li>
                <li><Link href="/schedule" className="text-gray-400 hover:text-white">Schedule</Link></li>
                <li><Link href="/register" className="text-gray-400 hover:text-white">Registration</Link></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <p className="text-gray-400 mb-2">Ponca City, Oklahoma</p>
              <p className="text-gray-400 mb-2">Email: info@poncacityunited.com</p>
              <p className="text-gray-400">Follow us on social media</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 mt-8 text-center">
            <p className="text-gray-400">
              © 2024 Ponca City United FC. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}