import { ViewfinderCircleIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import AnimateOnScroll, { StaggerContainer, StaggerItem } from './AnimateOnScroll';

export default function About() {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll variant="fadeInUp">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">About Our Club</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Ponca City United FC is dedicated to providing quality soccer training and development opportunities
              for young athletes in our community.
            </p>
          </div>
        </AnimateOnScroll>

        <StaggerContainer className="grid md:grid-cols-3 gap-x-8 gap-y-10 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          <StaggerItem>
            <div className="pt-6 md:pt-0 md:pr-8">
              <div className="flex items-center gap-2.5 mb-2">
                <ViewfinderCircleIcon className="w-5 h-5 text-team-red shrink-0" />
                <h3 className="text-xl font-bold text-team-blue">Skill Development</h3>
              </div>
              <p className="text-gray-600">
                Professional coaching focused on individual skill development and team strategy.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="pt-6 md:pt-0 md:px-8">
              <div className="flex items-center gap-2.5 mb-2">
                <TrophyIcon className="w-5 h-5 text-team-red shrink-0" />
                <h3 className="text-xl font-bold text-team-blue">Competitive Play</h3>
              </div>
              <p className="text-gray-600">
                Opportunities to compete in local and regional tournaments and leagues.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="pt-6 md:pt-0 md:pl-8">
              <div className="flex items-center gap-2.5 mb-2">
                <UserGroupIcon className="w-5 h-5 text-team-red shrink-0" />
                <h3 className="text-xl font-bold text-team-blue">Team Spirit</h3>
              </div>
              <p className="text-gray-600">
                Building character, teamwork, and lifelong friendships through soccer.
              </p>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </section>
  );
}
