import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About Ponca City <span className="text-team-red">United FC</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Our U10 Developmental team - where young players learn, grow, and develop their love for soccer together.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-6">
                As coaches of our U10 Developmental team, we are committed to creating a positive environment where 
                our sons and their teammates can develop their soccer skills while having fun. We believe that at 
                this age, the focus should be on learning fundamentals, building confidence, and fostering a lifelong 
                love for the beautiful game.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Our coaching approach emphasizes skill development, equal playing time, and positive reinforcement. 
                We want every player to feel valued, supported, and excited to come to practice and games.
              </p>
              <Link 
                href="/register" 
                className="bg-team-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 cursor-pointer"
              >
                Join Our Team
              </Link>
            </div>
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="Ponca City United FC Logo"
                width={400}
                height={400}
                className="drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Our Core Values</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              These values guide everything we do at Ponca City United FC, both on and off the field.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-team-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">💪</span>
              </div>
              <h3 className="text-xl font-bold text-team-blue mb-3">Excellence</h3>
              <p className="text-gray-600">
                Striving for personal best in every training session, game, and interaction.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-team-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">🤝</span>
              </div>
              <h3 className="text-xl font-bold text-team-blue mb-3">Teamwork</h3>
              <p className="text-gray-600">
                Success comes through collaboration, support, and playing for each other.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-team-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-team-blue mb-3">Respect</h3>
              <p className="text-gray-600">
                Treating teammates, opponents, coaches, and referees with dignity and honor.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-team-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-team-blue mb-3">Growth</h3>
              <p className="text-gray-600">
                Continuous improvement in skills, character, and understanding of the game.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Our Team</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We are currently coaching a U10 Developmental team, focusing on building 
              fundamental skills and fostering a love for the game.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-20 h-20 bg-team-red rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">U10</span>
              </div>
              <h3 className="text-2xl font-bold text-team-blue mb-4">U10 Developmental Team</h3>
              <p className="text-gray-600 mb-6">
                Our current team consists of players born in 2016-2017, competing in U10 
                Developmental. We focus on skill development, teamwork, and having fun 
                while learning the fundamentals of soccer through travel games and 3v3 summer tournaments.
              </p>
              <ul className="text-sm text-gray-600 text-left max-w-md mx-auto space-y-2">
                <li>• <strong>Birth Years:</strong> 2016-2017</li>
                <li>• <strong>Current Season:</strong> U10 Developmental</li>
                <li>• <strong>Next Season:</strong> Moving up to U12</li>
                <li>• <strong>Focus:</strong> Skill development & fun</li>
                <li>• <strong>Practice:</strong> 2 times per week</li>
                <li>• <strong>Games:</strong> Travel games & 3v3 tournaments</li>
                <li>• <strong>Philosophy:</strong> Equal playing time for all</li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
              <h4 className="font-bold text-team-blue mb-2">Looking Ahead</h4>
              <p className="text-gray-600">
                Our team will be moving up to U12 next season, continuing our development journey 
                together as we grow in skills, teamwork, and love for the game.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coaching Staff Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Our Coaching Philosophy</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our qualified coaching staff brings years of playing and coaching experience to develop 
              each player's potential while fostering a love for the beautiful game.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-4">Training Focus</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-team-red mr-3 mt-1">✓</span>
                  <span>Technical skill development (ball control, passing, shooting)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-team-red mr-3 mt-1">✓</span>
                  <span>Tactical awareness and game intelligence</span>
                </li>
                <li className="flex items-start">
                  <span className="text-team-red mr-3 mt-1">✓</span>
                  <span>Physical fitness and injury prevention</span>
                </li>
                <li className="flex items-start">
                  <span className="text-team-red mr-3 mt-1">✓</span>
                  <span>Mental strength and confidence building</span>
                </li>
                <li className="flex items-start">
                  <span className="text-team-red mr-3 mt-1">✓</span>
                  <span>Character development and leadership skills</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-4">Our Season Schedule</h3>
              <div className="space-y-4 text-gray-600">
                <div>
                  <h4 className="font-bold text-team-blue">Spring Season</h4>
                  <p>February - May • 2 tournaments + travel games • $95 registration</p>
                </div>
                <div>
                  <h4 className="font-bold text-team-blue">Summer Season</h4>
                  <p>June - July • 3 x 3v3 tournaments • ~$35 per tournament</p>
                </div>
                <div>
                  <h4 className="font-bold text-team-blue">Fall Season</h4>
                  <p>August - November • 2 tournaments + travel games • $95 registration</p>
                </div>
                <div>
                  <h4 className="font-bold text-team-blue">Winter Season</h4>
                  <p>December - January • Travel games and skill development</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-20 bg-team-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Part of the Community</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Ponca City United FC is proud to be part of the Ponca City community, supporting local youth 
              and promoting the sport of soccer throughout northern Oklahoma.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-team-red mb-2">15+</div>
              <div className="text-blue-100">Years of Excellence</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-team-red mb-2">200+</div>
              <div className="text-blue-100">Players Developed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-team-red mb-2">50+</div>
              <div className="text-blue-100">Tournament Victories</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-team-red mb-2">100%</div>
              <div className="text-blue-100">Commitment to Growth</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/register" 
              className="bg-team-red hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition duration-300 transform hover:scale-105 cursor-pointer"
            >
              Join Our Soccer Family
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}