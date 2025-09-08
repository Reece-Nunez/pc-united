import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Contact <span className="text-team-red">Us</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Have questions about our U10 team or interested in joining? We'd love to hear from you!
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-team-blue mb-8">Get In Touch</h2>
              <p className="text-lg text-gray-600 mb-8">
                We're always happy to answer questions about our team, discuss player development, 
                or talk about upcoming tournaments and travel games.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white text-xl">📧</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Email Us</h3>
                    <p className="text-gray-600">info@poncacityunited.com</p>
                    <p className="text-sm text-gray-500">Best way to reach us for detailed questions</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white text-xl">📱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Call or Text</h3>
                    <p className="text-gray-600">(580) 555-GOAL</p>
                    <p className="text-sm text-gray-500">Available evenings and weekends</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white text-xl">📍</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Practice Location</h3>
                    <p className="text-gray-600">Ponca City, Oklahoma</p>
                    <p className="text-sm text-gray-500">Specific locations shared with team families</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white text-xl">⚽</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Practice Schedule</h3>
                    <p className="text-gray-600">Tuesday & Thursday Evenings</p>
                    <p className="text-sm text-gray-500">Times vary by season</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-6">Send Us a Message</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Player's Birth Year (if applicable)</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none">
                    <option value="">Select birth year</option>
                    <option value="2015">2015</option>
                    <option value="2016">2016</option>
                    <option value="2017">2017</option>
                    <option value="2018">2018</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none">
                    <option value="">Select a topic</option>
                    <option value="registration">Player Registration</option>
                    <option value="tryouts">Team Information</option>
                    <option value="schedule">Schedule Questions</option>
                    <option value="travel">Travel Tournament Info</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea 
                    rows={5}
                    required
                    placeholder="Tell us how we can help you..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-team-red hover:bg-red-700 text-white font-bold py-3 rounded-lg transition duration-300 cursor-pointer"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">
              Common questions about our U10 Developmental team
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-team-blue mb-3">Who can join the team?</h3>
              <p className="text-gray-600">
                We're currently focused on players born in 2016-2017 (U10 age group). If your child 
                was born in these years and you're interested in developmental soccer with travel games 
                and tournaments, we'd love to hear from you.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-team-blue mb-3">What's the time commitment?</h3>
              <p className="text-gray-600">
                We practice twice per week (typically Tuesday and Thursday evenings) and participate 
                in travel games throughout the year. Spring and Fall include 2 tournaments each plus 
                travel games. Summer features 3 fun 3v3 tournaments. We play year-round with different seasons.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-team-blue mb-3">How much does it cost?</h3>
              <p className="text-gray-600">
                Spring and Fall seasons are $95 each. Summer 3v3 tournaments are around $35 per tournament 
                (we typically do 3 tournaments). Additional costs include travel expenses and team gear. 
                We try to keep costs reasonable while providing quality development opportunities.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-team-blue mb-3">What's your coaching philosophy?</h3>
              <p className="text-gray-600">
                At the U10 level, we focus on skill development, equal playing time, and ensuring 
                every player has fun while learning. We emphasize positive reinforcement and building 
                confidence in a supportive team environment.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-team-blue mb-3">Do you provide transportation?</h3>
              <p className="text-gray-600">
                Families are responsible for getting their players to practices and travel games. 
                We coordinate carpools when possible and provide detailed travel information for 
                all tournaments and away games.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}