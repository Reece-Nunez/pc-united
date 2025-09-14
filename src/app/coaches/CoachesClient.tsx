'use client';

import Image from "next/image";

interface Coach {
  id: number;
  name: string;
  title: string;
  photo: string;
  bio: string;
  experience: string;
  certifications: string[];
  philosophy: string;
  email?: string;
  specialties: string[];
}

interface Volunteer {
  id: number;
  name: string;
  role: string;
  photo: string;
  bio: string;
  background: string;
}

export default function CoachesClient() {
  const coaches: Coach[] = [
    {
      id: 1,
      name: "Coach Veronica Ramirez",
      title: "Head Coach",
      photo: "/logo.png", // Replace with actual coach photos
      bio: "With extensive experience in youth development and competitive soccer, Coach Ramirez brings a wealth of knowledge and passion to our program. She focuses on building both technical skills and strong character in every player.",
      experience: "Experienced in youth soccer coaching and player development",
      certifications: ["USSF Coaching Certification", "Youth Development Specialist", "SafeSport Certified"],
      philosophy: "Every player has potential. My job is to help them discover it while fostering a love for the beautiful game and building confidence both on and off the field.",
      email: "vramirez@poncacityunited.com",
      specialties: ["Youth Development", "Tactical Strategy", "Team Leadership"]
    },
    {
      id: 2,
      name: "Coach Joshua McKeachnie",
      title: "Assistant Coach",
      photo: "/logo.png", // Replace with actual coach photos
      bio: "Coach McKeachnie brings energy and expertise to our coaching staff, specializing in technical skills development and individual player training. His dedication to player improvement is evident in every training session.",
      experience: "Dedicated youth soccer coach with focus on skill development",
      certifications: ["USSF Coaching License", "Technical Skills Development", "First Aid/CPR Certified"],
      philosophy: "Technical excellence combined with tactical intelligence creates well-rounded players who can adapt to any situation on the field.",
      email: "jmckeachnie@poncacityunited.com",
      specialties: ["Technical Skills", "Individual Training", "Player Development"]
    },
    {
      id: 3,
      name: "Coach Reece Nunez",
      title: "Goalkeeper & Assistant Coach",
      photo: "/logo.png", // Replace with actual coach photos
      bio: "Coach Nunez serves as both our goalkeeper specialist and assistant coach, bringing comprehensive knowledge of both goalkeeping techniques and overall team strategy. His dual role allows for well-rounded team development.",
      experience: "Specialized in goalkeeper coaching and team assistance",
      certifications: ["USSF Goalkeeping License", "Assistant Coaching Certification", "Mental Training Certified"],
      philosophy: "Goalkeeping is as much about mental strength as physical ability. We develop confident, decisive keepers while supporting the entire team's growth.",
      email: "rnunez@poncacityunited.com",
      specialties: ["Goalkeeper Training", "Shot Stopping", "Team Strategy"]
    }
  ];

  const volunteers: Volunteer[] = [
    {
      id: 1,
      name: "Juan Navarro",
      role: "Volunteer Coach & Player Mentor",
      photo: "/logo.png", // Replace with actual volunteer photos
      bio: "Juan brings invaluable professional playing experience to our club, having played professionally in Mexico. His expertise and passion for the game inspire our players to reach new heights.",
      background: "Former professional soccer player in Mexico, Extensive playing experience at high levels"
    },
    {
      id: 2,
      name: "Miguel Angel Gonzalez",
      role: "Volunteer Coach & Tactical Advisor",
      photo: "/logo.png", // Replace with actual volunteer photos
      bio: "Miguel Angel contributes decades of coaching wisdom to our program, having coached numerous teams throughout Mexico. His tactical knowledge and leadership experience are invaluable assets to our club.",
      background: "Experienced coach of multiple teams in Mexico, Tactical specialist with extensive coaching background"
    }
  ];

  return (
    <>
      {/* Coaching Philosophy Section */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-6">Our Coaching Philosophy</h2>
            <p className="text-lg text-gray-700 mb-4">
              At Ponca City United FC, we believe in developing not just skilled soccer players, but confident, 
              respectful young people who understand the value of teamwork, dedication, and sportsmanship.
            </p>
            <p className="text-lg text-gray-700">
              Our experienced coaching staff is committed to creating a positive environment where every player 
              can grow, learn, and reach their full potential both on and off the field.
            </p>
          </div>
        </div>
      </section>

      {/* Main Coaching Staff */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Coaching Staff</h2>
          
          <div className="grid gap-8 md:gap-12 lg:grid-cols-1 xl:grid-cols-1">
            {coaches.map((coach) => (
              <div key={coach.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-lg">
                <div className="md:flex">
                  {/* Coach Photo */}
                  <div className="md:w-1/3 lg:w-1/4">
                    <div className="aspect-square md:aspect-auto md:h-full bg-gray-300 relative">
                      <Image
                        src={coach.photo}
                        alt={coach.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                  </div>
                  
                  {/* Coach Information */}
                  <div className="md:w-2/3 lg:w-3/4 p-6 md:p-8">
                    <div className="mb-4">
                      <h3 className="text-xl md:text-2xl font-bold text-team-blue mb-2">{coach.name}</h3>
                      <p className="text-lg text-team-red font-semibold mb-4">{coach.title}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                        <p className="text-gray-700">{coach.bio}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Experience</h4>
                        <p className="text-gray-700">{coach.experience}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Certifications</h4>
                        <div className="flex flex-wrap gap-2">
                          {coach.certifications.map((cert, index) => (
                            <span 
                              key={index}
                              className="bg-team-blue text-white px-3 py-1 rounded-full text-xs md:text-sm"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Specialties</h4>
                        <div className="flex flex-wrap gap-2">
                          {coach.specialties.map((specialty, index) => (
                            <span 
                              key={index}
                              className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs md:text-sm"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">Coaching Philosophy</h4>
                        <p className="text-gray-700 italic">"{coach.philosophy}"</p>
                      </div>
                      
                      {coach.email && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Contact</h4>
                          <a 
                            href={`mailto:${coach.email}`}
                            className="text-team-blue hover:text-blue-700 font-medium"
                          >
                            {coach.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Volunteers Section */}
      <section className="py-8 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Our Amazing Volunteers</h2>
          <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
            Our volunteers are the backbone of our organization, dedicating their time and energy 
            to support our teams and make every season successful.
          </p>
          
          <div className="grid gap-6 md:gap-8 md:grid-cols-2">
            {volunteers.map((volunteer) => (
              <div key={volunteer.id} className="bg-white rounded-lg overflow-hidden shadow-lg">
                <div className="flex flex-col sm:flex-row">
                  {/* Volunteer Photo */}
                  <div className="sm:w-1/3">
                    <div className="aspect-square sm:aspect-auto sm:h-full bg-gray-300 relative">
                      <Image
                        src={volunteer.photo}
                        alt={volunteer.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    </div>
                  </div>
                  
                  {/* Volunteer Information */}
                  <div className="sm:w-2/3 p-6">
                    <h3 className="text-lg md:text-xl font-bold text-team-blue mb-2">{volunteer.name}</h3>
                    <p className="text-team-red font-semibold mb-3">{volunteer.role}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-700 text-sm md:text-base">{volunteer.bio}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm">Background</h4>
                        <p className="text-gray-600 text-sm">{volunteer.background}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Our Team Section */}
      <section className="py-8 md:py-12 bg-team-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Want to Join Our Coaching Team?</h2>
          <p className="text-lg text-blue-100 mb-6 max-w-3xl mx-auto">
            We're always looking for passionate individuals who want to make a difference in young athletes' lives. 
            Whether you're an experienced coach or looking to volunteer, we'd love to hear from you.
          </p>
          <a 
            href="/contact" 
            className="inline-block bg-white text-team-blue px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Involved →
          </a>
        </div>
      </section>
    </>
  );
}