import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import { EnvelopeIcon, PhoneIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';

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
                {/* Veronica Ramirez */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <EnvelopeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Veronica Ramirez — Head Coach</h3>
                    <a href="mailto:vramirez@poncacityunited.com" className="text-gray-600 hover:text-team-red transition-colors block">vramirez@poncacityunited.com</a>
                    <a href="tel:5803046922" className="text-gray-600 hover:text-team-red transition-colors block">(580) 304-6922</a>
                  </div>
                </div>

                {/* Reece Nunez */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <EnvelopeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Reece Nunez — Assistant Coach</h3>
                    <a href="mailto:rnunez@poncacityunited.com" className="text-gray-600 hover:text-team-red transition-colors block">rnunez@poncacityunited.com</a>
                    <a href="tel:4356606100" className="text-gray-600 hover:text-team-red transition-colors block">(435) 660-6100</a>
                  </div>
                </div>

                {/* Joshua McKeachnie */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <EnvelopeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Joshua McKeachnie — Assistant Coach</h3>
                    <a href="mailto:jmckeachnie@poncacityunited.com" className="text-gray-600 hover:text-team-red transition-colors block">jmckeachnie@poncacityunited.com</a>
                    <a href="tel:8018510297" className="text-gray-600 hover:text-team-red transition-colors block">(801) 851-0297</a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <MapPinIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Practice Location</h3>
                    <p className="text-gray-600">Ponca City, Oklahoma</p>
                    <p className="text-sm text-gray-500">Specific locations shared with team families</p>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-team-red rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <CalendarIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-team-blue mb-1">Practice Schedule</h3>
                    <p className="text-gray-600">Tuesday & Thursday Evenings</p>
                    <p className="text-sm text-gray-500">Times vary by season</p>
                  </div>
                </div>
              </div>
            </div>
            
            <ContactForm />
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