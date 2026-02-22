import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import AnimateOnScroll from './AnimateOnScroll';

export default function Contact() {
  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll variant="fadeInUp">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Get In Touch</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Have questions about registration or our programs? We'd love to hear from you!
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 gap-12">
          <AnimateOnScroll variant="slideInLeft">
            <h3 className="text-2xl font-bold text-team-blue mb-6">Contact Information</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-team-blue mb-2">Veronica Ramirez — Head Coach</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <EnvelopeIcon className="w-5 h-5 text-team-red mr-3 flex-shrink-0" />
                    <a href="mailto:vramirez@poncacityunited.com" className="hover:text-team-red transition-colors">vramirez@poncacityunited.com</a>
                  </div>
                  <div className="flex items-center">
                    <PhoneIcon className="w-5 h-5 text-team-red mr-3 flex-shrink-0" />
                    <a href="tel:5803046922" className="hover:text-team-red transition-colors">(580) 304-6922</a>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-team-blue mb-2">Reece Nunez — Assistant Coach</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <EnvelopeIcon className="w-5 h-5 text-team-red mr-3 flex-shrink-0" />
                    <a href="mailto:rnunez@poncacityunited.com" className="hover:text-team-red transition-colors">rnunez@poncacityunited.com</a>
                  </div>
                  <div className="flex items-center">
                    <PhoneIcon className="w-5 h-5 text-team-red mr-3 flex-shrink-0" />
                    <a href="tel:4356606100" className="hover:text-team-red transition-colors">(435) 660-6100</a>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-team-blue mb-2">Joshua McKeachnie — Assistant Coach</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <EnvelopeIcon className="w-5 h-5 text-team-red mr-3 flex-shrink-0" />
                    <a href="mailto:jmckeachnie@poncacityunited.com" className="hover:text-team-red transition-colors">jmckeachnie@poncacityunited.com</a>
                  </div>
                  <div className="flex items-center">
                    <PhoneIcon className="w-5 h-5 text-team-red mr-3 flex-shrink-0" />
                    <a href="tel:8018510297" className="hover:text-team-red transition-colors">(801) 851-0297</a>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="w-5 h-5 text-team-red mr-3 flex-shrink-0" />
                <span>Ponca City, Oklahoma</span>
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll variant="slideInRight" delay={0.2}>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-6">Quick Message</h3>
              <form className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                />
                <textarea
                  placeholder="Your Message"
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
                ></textarea>
                <button
                  type="submit"
                  className="w-full bg-team-red hover:bg-red-700 text-white font-bold py-3 rounded-lg transition duration-300 cursor-pointer"
                >
                  Send Message
                </button>
              </form>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
