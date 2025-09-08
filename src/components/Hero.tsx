import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section id="home" className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Join Ponca City <span className="text-team-red">United FC</span>
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Developing young athletes through quality soccer training, teamwork, and sportsmanship in Ponca City, Oklahoma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/register"
                className="bg-team-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 text-center cursor-pointer"
              >
                Register Now
              </Link>
              <Link 
                href="/about"
                className="border-2 border-white text-white hover:bg-white hover:text-team-blue font-bold py-3 px-8 rounded-lg transition duration-300 cursor-pointer text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Ponca City United FC Logo"
              width={300}
              height={300}
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}