'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { getActiveCoaches, Coach } from "@/lib/supabase";

const COACHING_ROLES = ['head_coach', 'assistant_coach', 'goalkeeper_coach', 'fitness_coach'];

function roleDisplayName(role: string): string {
  switch (role) {
    case 'head_coach': return 'Head Coach';
    case 'assistant_coach': return 'Assistant Coach';
    case 'goalkeeper_coach': return 'Goalkeeper Coach';
    case 'fitness_coach': return 'Fitness Coach';
    case 'volunteer': return 'Volunteer';
    default: return role;
  }
}

function CertBadge({ label, certified }: { label: string; certified: boolean }) {
  if (!certified) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {label}
    </span>
  );
}

export default function CoachesClient() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await getActiveCoaches();
      if (data) setCoaches(data);
      setLoading(false);
    }
    load();
  }, []);

  const coachingStaff = coaches.filter(c => COACHING_ROLES.includes(c.role));
  const volunteers = coaches.filter(c => c.role === 'volunteer');

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

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading coaches...</div>
          ) : coachingStaff.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Our coaching staff information is being updated. Please check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-8 md:gap-12 lg:grid-cols-1 xl:grid-cols-1">
              {coachingStaff.map((coach) => (
                <div key={coach.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-lg">
                  <div className="md:flex">
                    {/* Coach Photo */}
                    <div className="md:w-1/3 lg:w-1/4">
                      <div className="aspect-square md:aspect-auto md:h-full bg-gray-300 relative">
                        <Image
                          src={coach.photo_url || '/logo.png'}
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
                        <p className="text-lg text-team-red font-semibold mb-3">{coach.title || roleDisplayName(coach.role)}</p>

                        {/* Certification Badges */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          <CertBadge label="Background Check" certified={coach.background_check} />
                          <CertBadge label="First Aid" certified={coach.first_aid_certified} />
                          <CertBadge label="Concussion Trained" certified={coach.concussion_trained} />
                          <CertBadge label="SafeSport" certified={coach.safesport_certified} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        {coach.bio && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                            <p className="text-gray-700">{coach.bio}</p>
                          </div>
                        )}

                        {coach.experience && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Experience</h4>
                            <p className="text-gray-700">{coach.experience}</p>
                          </div>
                        )}

                        {coach.certifications && coach.certifications.length > 0 && (
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
                        )}

                        {coach.specialties && coach.specialties.length > 0 && (
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
                        )}

                        {coach.philosophy && (
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2">Coaching Philosophy</h4>
                            <p className="text-gray-700 italic">&ldquo;{coach.philosophy}&rdquo;</p>
                          </div>
                        )}

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
          )}
        </div>
      </section>

      {/* Volunteers Section */}
      {(loading || volunteers.length > 0) && (
        <section className="py-8 md:py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Our Amazing Volunteers</h2>
            <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
              Our volunteers are the backbone of our organization, dedicating their time and energy
              to support our teams and make every season successful.
            </p>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading volunteers...</div>
            ) : (
              <div className="grid gap-6 md:gap-8 md:grid-cols-2">
                {volunteers.map((volunteer) => (
                  <div key={volunteer.id} className="bg-white rounded-lg overflow-hidden shadow-lg">
                    <div className="flex flex-col sm:flex-row">
                      {/* Volunteer Photo */}
                      <div className="sm:w-1/3">
                        <div className="aspect-square sm:aspect-auto sm:h-full bg-gray-300 relative">
                          <Image
                            src={volunteer.photo_url || '/logo.png'}
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
                        <p className="text-team-red font-semibold mb-2">{volunteer.title || 'Volunteer'}</p>

                        {/* Certification Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <CertBadge label="Background Check" certified={volunteer.background_check} />
                          <CertBadge label="First Aid" certified={volunteer.first_aid_certified} />
                          <CertBadge label="Concussion Trained" certified={volunteer.concussion_trained} />
                          <CertBadge label="SafeSport" certified={volunteer.safesport_certified} />
                        </div>

                        <div className="space-y-3">
                          {volunteer.bio && (
                            <div>
                              <p className="text-gray-700 text-sm md:text-base">{volunteer.bio}</p>
                            </div>
                          )}

                          {volunteer.experience && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1 text-sm">Background</h4>
                              <p className="text-gray-600 text-sm">{volunteer.experience}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Join Our Team Section */}
      <section className="py-8 md:py-12 bg-team-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Want to Join Our Coaching Team?</h2>
          <p className="text-lg text-blue-100 mb-6 max-w-3xl mx-auto">
            We&apos;re always looking for passionate individuals who want to make a difference in young athletes&apos; lives.
            Whether you&apos;re an experienced coach or looking to volunteer, we&apos;d love to hear from you.
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
