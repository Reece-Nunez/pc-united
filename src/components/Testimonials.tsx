import AnimateOnScroll, { StaggerContainer, StaggerItem } from './AnimateOnScroll';

const testimonials = [
  {
    quote: "My son has grown so much since joining Ponca City United. The coaches are amazing and truly care about each player's development — not just on the field, but as people.",
    name: "Parent",
    role: "U10 Team Parent",
  },
  {
    quote: "The travel games and tournaments have been incredible experiences for our family. It's so much more than just soccer — it's a community.",
    name: "Parent",
    role: "U10 Team Parent",
  },
  {
    quote: "What I love most is the equal playing time and positive coaching. My daughter's confidence has skyrocketed since she started playing with this team.",
    name: "Parent",
    role: "U10 Team Parent",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll variant="fadeInUp">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">
              What Parents Are Saying
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hear from the families who make our team community special.
            </p>
          </div>
        </AnimateOnScroll>

        <StaggerContainer className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <StaggerItem key={i}>
              <div className="bg-white rounded-lg p-8 shadow-lg h-full flex flex-col">
                <div className="text-team-red text-4xl mb-4 leading-none">"</div>
                <p className="text-gray-700 flex-1 mb-6 italic leading-relaxed">
                  {t.quote}
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-bold text-team-blue">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
