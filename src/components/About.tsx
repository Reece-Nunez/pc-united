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

        <StaggerContainer className="grid md:grid-cols-3 gap-8">
          <StaggerItem>
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-team-red rounded-full flex items-center justify-center mx-auto mb-4">
                <ViewfinderCircleIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-team-blue mb-3">Skill Development</h3>
              <p className="text-gray-600">
                Professional coaching focused on individual skill development and team strategy.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-team-red rounded-full flex items-center justify-center mx-auto mb-4">
                <TrophyIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-team-blue mb-3">Competitive Play</h3>
              <p className="text-gray-600">
                Opportunities to compete in local and regional tournaments and leagues.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-team-red rounded-full flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-team-blue mb-3">Team Spirit</h3>
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
