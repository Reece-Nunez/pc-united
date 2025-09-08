'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import {
  getNews,
  getEvents,
  getSchedule,
  getActiveAnnouncements,
  News,
  Event,
  Schedule,
  Announcement
} from "@/lib/supabase";

export default function TeamPage() {
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('news');

  useEffect(() => {
    async function fetchTeamData() {
      try {
        const [newsResult, eventsResult, scheduleResult, announcementsResult] = await Promise.all([
          getNews(),
          getEvents(),
          getSchedule(),
          getActiveAnnouncements()
        ]);

        if (newsResult.error) throw newsResult.error;
        if (eventsResult.error) throw eventsResult.error;
        if (scheduleResult.error) throw scheduleResult.error;
        if (announcementsResult.error) throw announcementsResult.error;

        setNews(newsResult.data || []);
        setEvents(eventsResult.data || []);
        setSchedule(scheduleResult.data || []);
        setAnnouncements(announcementsResult.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTeamData();
  }, []);

  // Calculate team statistics
  const completedGames = schedule.filter(game => game.status === 'completed');
  const wins = completedGames.filter(game => 
    (game.our_score !== null && game.our_score !== undefined && 
     game.opponent_score !== null && game.opponent_score !== undefined) &&
    game.our_score > game.opponent_score
  ).length;
  const losses = completedGames.filter(game => 
    (game.our_score !== null && game.our_score !== undefined && 
     game.opponent_score !== null && game.opponent_score !== undefined) &&
    game.our_score < game.opponent_score
  ).length;
  const draws = completedGames.filter(game => 
    (game.our_score !== null && game.our_score !== undefined && 
     game.opponent_score !== null && game.opponent_score !== undefined) &&
    game.our_score === game.opponent_score
  ).length;
  const totalGoalsFor = completedGames.reduce((sum, game) => sum + (game.our_score ?? 0), 0);
  const totalGoalsAgainst = completedGames.reduce((sum, game) => sum + (game.opponent_score ?? 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Loading Team Information...</h1>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Error Loading Team Information</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please ensure Supabase is properly configured.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Team Central</h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              Stay up to date with the latest news, events, schedules, and team performance
            </p>
          </div>
        </div>
      </section>

      {/* Active Announcements */}
      {announcements.length > 0 && (
        <section className="py-8 bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-team-blue mb-4">📢 Important Announcements</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.slice(0, 3).map((announcement) => (
                <div 
                  key={announcement.id} 
                  className={`p-4 rounded-lg border-l-4 ${
                    announcement.priority === 3 ? 'border-red-500 bg-red-50' :
                    announcement.priority === 2 ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <h3 className="font-bold text-lg mb-2">{announcement.title}</h3>
                  <p className="text-gray-700">{announcement.content}</p>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <span className="capitalize">{announcement.announcement_type}</span>
                    <span>{new Date(announcement.created_at!).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team Stats */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-team-blue mb-8 text-center">Season Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">{wins}</div>
              <div className="text-gray-600">Wins</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-red-600 mb-2">{losses}</div>
              <div className="text-gray-600">Losses</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{draws}</div>
              <div className="text-gray-600">Draws</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">{totalGoalsFor}</div>
              <div className="text-gray-600">Goals For</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-gray-600 mb-2">{totalGoalsAgainst}</div>
              <div className="text-gray-600">Goals Against</div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center space-x-8">
            {['news', 'schedule', 'events'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-team-blue text-white'
                    : 'text-team-blue hover:bg-blue-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* News Tab */}
          {activeTab === 'news' && (
            <div>
              <h2 className="text-3xl font-bold text-team-blue mb-12 text-center">Latest News</h2>
              {news.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">No news articles available yet.</div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {news.map((article) => (
                    <div key={article.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300">
                      {article.featured_image && (
                        <div className="aspect-video bg-gray-300">
                          <Image
                            src={article.featured_image}
                            alt={article.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-team-blue mb-3">{article.title}</h3>
                        {article.excerpt && (
                          <p className="text-gray-600 mb-4">{article.excerpt}</p>
                        )}
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>{article.author || 'Team Staff'}</span>
                          <span>{new Date(article.publish_date!).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div>
              <h2 className="text-3xl font-bold text-team-blue mb-12 text-center">Game Schedule & Results</h2>
              {schedule.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">No games scheduled yet.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedule.map((game) => (
                    <div key={game.id} className="bg-gray-50 rounded-lg p-6 shadow-lg">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h3 className="text-xl font-bold text-team-blue">
                              Ponca City United vs {game.opponent}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              game.status === 'completed' ? 'bg-gray-200 text-gray-800' :
                              game.status === 'in_progress' ? 'bg-green-200 text-green-800' :
                              game.status === 'cancelled' ? 'bg-red-200 text-red-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {game.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="text-gray-600 space-y-1">
                            <p><strong>Date:</strong> {new Date(game.game_date).toLocaleDateString()} at {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p><strong>Location:</strong> {game.location} {game.home_game ? '🏠' : '✈️'}</p>
                            <p><strong>Type:</strong> {game.game_type.toUpperCase()}</p>
                          </div>
                        </div>
                        
                        {game.status === 'completed' && 
                         game.our_score !== null && game.our_score !== undefined && 
                         game.opponent_score !== null && game.opponent_score !== undefined && (
                          <div className="mt-4 md:mt-0 text-center">
                            <div className="text-2xl font-bold">
                              <span className={game.our_score > game.opponent_score ? 'text-green-600' : 'text-red-600'}>
                                {game.our_score}
                              </span>
                              {' - '}
                              <span className={game.opponent_score > game.our_score ? 'text-green-600' : 'text-red-600'}>
                                {game.opponent_score}
                              </span>
                            </div>
                            <div className={`text-sm font-semibold ${
                              game.our_score > game.opponent_score ? 'text-green-600' : 
                              game.our_score < game.opponent_score ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {game.our_score > game.opponent_score ? 'WIN' : 
                               game.our_score < game.opponent_score ? 'LOSS' : 'DRAW'}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {game.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-gray-700">{game.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <h2 className="text-3xl font-bold text-team-blue mb-12 text-center">Upcoming Events</h2>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">No upcoming events scheduled.</div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {events.map((event) => (
                    <div key={event.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300">
                      {event.featured_image && (
                        <div className="aspect-video bg-gray-300">
                          <Image
                            src={event.featured_image}
                            alt={event.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            event.event_type === 'game' ? 'bg-green-200 text-green-800' :
                            event.event_type === 'tournament' ? 'bg-purple-200 text-purple-800' :
                            event.event_type === 'practice' ? 'bg-blue-200 text-blue-800' :
                            event.event_type === 'meeting' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {event.event_type.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-team-blue mb-3">{event.title}</h3>
                        {event.description && (
                          <p className="text-gray-600 mb-4">{event.description}</p>
                        )}
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}</p>
                          <p><strong>Time:</strong> {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          {event.location && <p><strong>Location:</strong> {event.location}</p>}
                          {event.registration_required && (
                            <div className="pt-2">
                              <span className="text-red-600 font-semibold">Registration Required</span>
                              {event.registration_link && (
                                <a href={event.registration_link} target="_blank" rel="noopener noreferrer" className="block text-team-blue hover:underline">
                                  Click to Register →
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
}