import AnimateOnScroll, { StaggerContainer, StaggerItem } from './AnimateOnScroll';

const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const testimonials = [
  {
    quote: "PC team has been such an amazing team for my son. Not only are they a team but also family! They work together on the field and off the field like family. Well put together, very experienced team! Coaches are highly respected and very involved with every kiddo.",
    name: "Parent",
    role: "U10 Team Parent",
    rating: 5,
  },
  {
    quote: "The travel games and tournaments have been incredible experiences for our family. It's so much more than just soccer — it's a community.",
    name: "Parent",
    role: "U10 Team Parent",
    rating: 5,
  },
  {
    quote: "What I love most is the equal playing time and positive coaching. My daughter's confidence has skyrocketed since she started playing with this team.",
    name: "Parent",
    role: "U10 Team Parent",
    rating: 5,
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
              <div className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
                <div className="absolute right-6 top-6 text-6xl font-serif text-gray-100 leading-none select-none" aria-hidden="true">
                  &ldquo;
                </div>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <StarIcon key={j} />
                  ))}
                </div>
                <p className="text-gray-600 flex-1 mb-6 leading-relaxed">
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
