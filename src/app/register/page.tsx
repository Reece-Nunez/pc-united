import Image from 'next/image'
import Link from 'next/link'
import RegistrationForm from '../components/RegistrationForm'

export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="bg-pcuf-blue shadow-lg">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center">
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
            </Link>
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

      {/* Registration Header */}
      <section className="bg-pcuf-blue text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Player Registration</h1>
          <p className="text-xl text-blue-100 mb-2">Join Ponca City United FC for the 2024-2025 Season</p>
          <p className="text-blue-200">
            Complete the form below to register your child for our youth soccer program
          </p>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <RegistrationForm />
          </div>
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