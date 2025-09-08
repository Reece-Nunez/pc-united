import Link from "next/link";

export default function Registration() {
  return (
    <section id="register" className="py-20 bg-team-blue text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join?</h2>
        <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
          Registration is now open for the upcoming season. Sign up today to secure your spot on the team!
        </p>
        <Link 
          href="/register"
          className="bg-team-red hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition duration-300 transform hover:scale-105 inline-block cursor-pointer"
        >
          Start Registration
        </Link>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-team-red mb-2">2016-2017</div>
            <div className="text-blue-100">Birth Years</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-team-red mb-2">Year Round</div>
            <div className="text-blue-100">Four Seasons</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-team-red mb-2">2x Week</div>
            <div className="text-blue-100">Practice Schedule</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-team-red mb-2">$95</div>
            <div className="text-blue-100">Spring/Fall Registration</div>
          </div>
        </div>
      </div>
    </section>
  );
}