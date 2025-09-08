export default function Contact() {
  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Get In Touch</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have questions about registration or our programs? We'd love to hear from you!
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold text-team-blue mb-6">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="text-team-red mr-3">📧</span>
                <span>info@poncacityunited.com</span>
              </div>
              <div className="flex items-center">
                <span className="text-team-red mr-3">📱</span>
                <span>(580) 555-GOAL</span>
              </div>
              <div className="flex items-center">
                <span className="text-team-red mr-3">📍</span>
                <span>Ponca City, Oklahoma</span>
              </div>
            </div>
          </div>
          
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
        </div>
      </div>
    </section>
  );
}