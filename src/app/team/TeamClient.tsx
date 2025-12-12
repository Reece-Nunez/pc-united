'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
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

export default function TeamClient() {
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('news');

  // Helper function to parse UTC date as local time for display
  const parseAsLocalTime = (utcDateString: string): Date => {
    // Remove timezone info and treat as local time
    const dateStr = utcDateString.replace(/[+-]\d{2}:?\d{0,2}$|Z$/g, '');
    return new Date(dateStr);
  };

  // Initialize GameChanger widget when script loads
  const initializeGameChangerWidget = () => {
    console.log('GameChanger script loaded, window.GC available:', !!(window as any).GC);
    
    if (typeof window !== 'undefined' && (window as any).GC) {
      console.log('GameChanger object found, available methods:', Object.keys((window as any).GC));
      
      const targetElement = document.getElementById('gc-schedule-widget-y5h5');
      console.log('Target element found:', !!targetElement);
      
      if (targetElement) {
        try {
          // Clear any existing content first
          targetElement.innerHTML = '<div class="text-center text-gray-500 p-4">Loading GameChanger schedule...</div>';
          
          // Try different initialization approaches
          const widgetConfigs = [
            {
              target: "#gc-schedule-widget-y5h5",
              widgetId: "61f71200-adeb-4695-a7ea-a5f8a21138e1",
              maxVerticalGamesVisible: 4,
            },
            {
              target: "#gc-schedule-widget-y5h5",
              widgetId: "61f71200-adeb-4695-a7ea-a5f8a21138e1",
              maxGamesVisible: 4,
            },
            {
              target: "#gc-schedule-widget-y5h5",
              widgetId: "61f71200-adeb-4695-a7ea-a5f8a21138e1",
              limit: 4,
            }
          ];
          
          // Try the first config
          let widgetConfig = widgetConfigs[0];
          console.log('Initializing widget with config:', widgetConfig);
          
          try {
            (window as any).GC.team.schedule.init(widgetConfig);
          } catch (initError) {
            console.log('First config failed, trying alternative configs...', initError);
            
            // Try alternative configs
            for (let i = 1; i < widgetConfigs.length; i++) {
              try {
                widgetConfig = widgetConfigs[i];
                console.log('Trying config', i + 1, ':', widgetConfig);
                (window as any).GC.team.schedule.init(widgetConfig);
                break;
              } catch (altError) {
                console.log(`Config ${i + 1} also failed:`, altError);
              }
            }
          }
          
          console.log('GameChanger widget initialized successfully');
          
          // Check if widget loaded successfully after delays
          setTimeout(() => {
            console.log('Checking widget content after 2 seconds...');
            console.log('Target element innerHTML length:', targetElement.innerHTML.length);
            console.log('Target element children count:', targetElement.children.length);
            
            // Look for any content that suggests the widget loaded
            const hasRealContent = targetElement.innerHTML.length > 200 && 
                                 !targetElement.innerHTML.includes('Loading GameChanger schedule');
            
            if (!hasRealContent) {
              console.log('Widget still appears empty after 2 seconds, waiting longer...');
              
              setTimeout(() => {
                console.log('Final check after 5 seconds...');
                console.log('Target element innerHTML length:', targetElement.innerHTML.length);
                console.log('Target element current content:', targetElement.innerHTML.substring(0, 100) + '...');
                
                const stillEmpty = targetElement.innerHTML.length < 200 || 
                                 targetElement.innerHTML.includes('Loading GameChanger schedule');
                
                if (stillEmpty) {
                  console.log('Widget failed to load, showing fallback message');
                  targetElement.style.display = 'none';
                  const fallbackElement = document.getElementById('gc-fallback-message');
                  if (fallbackElement) {
                    fallbackElement.classList.remove('hidden');
                  }
                } else {
                  console.log('Widget loaded successfully - removing loading styling');
                  // Remove the dashed border since content loaded
                  targetElement.style.border = 'none';
                  targetElement.style.minHeight = 'auto';
                }
              }, 3000);
            } else {
              console.log('Widget loaded successfully - removing loading styling');
              // Remove the dashed border since content loaded
              targetElement.style.border = 'none';
              targetElement.style.minHeight = 'auto';
            }
          }, 2000);
          
        } catch (error) {
          console.error('Error initializing GameChanger widget:', error);
          // Show error in the widget area
          if (targetElement) {
            targetElement.innerHTML = `
              <div class="text-center text-red-500 p-4">
                <p>Error loading GameChanger widget</p>
                <p class="text-xs mt-2">Check console for details</p>
              </div>
            `;
          }
        }
      }
    } else {
      console.log('GameChanger object not found, retrying in 1 second...');
      setTimeout(initializeGameChangerWidget, 1000);
    }
  };

  // Also try to initialize when the schedule tab becomes active
  useEffect(() => {
    if (activeTab === 'schedule') {
      // Small delay to ensure the DOM element exists
      setTimeout(() => {
        const widgetElement = document.getElementById('gc-schedule-widget-y5h5');
        if (widgetElement && (window as any).GC) {
          console.log('Schedule tab active, re-initializing widget...');
          initializeGameChangerWidget();
        }
      }, 500);
    }
  }, [activeTab]);

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
      <div className="py-12 md:py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
        <h1 className="text-2xl md:text-4xl font-bold text-team-blue mb-4">Loading Team Information...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 md:py-20 text-center">
        <h1 className="text-2xl md:text-4xl font-bold text-team-blue mb-4">Error Loading Team Information</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <p className="text-sm text-gray-500">Please ensure Supabase is properly configured.</p>
      </div>
    );
  }

  return (
    <>
      {/* Active Announcements */}
      {announcements.length > 0 && (
        <section className="py-6 md:py-8 bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl md:text-2xl font-bold text-team-blue mb-4">📢 Important Announcements</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {announcements.slice(0, 3).map((announcement) => (
                <div 
                  key={announcement.id} 
                  className={`p-4 rounded-lg border-l-4 ${
                    announcement.priority === 3 ? 'border-red-500 bg-red-50' :
                    announcement.priority === 2 ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <h3 className="font-bold text-base md:text-lg mb-2">{announcement.title}</h3>
                  <p className="text-gray-700 text-sm md:text-base">{announcement.content}</p>
                  <div className="mt-2 flex items-center justify-between text-xs md:text-sm text-gray-500">
                    <span className="capitalize">{announcement.announcement_type}</span>
                    <span>{parseAsLocalTime(announcement.created_at!).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team Stats */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-6 md:mb-8 text-center">Season Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-green-600 mb-2">{wins}</div>
              <div className="text-sm md:text-base text-gray-600">Wins</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-red-600 mb-2">{losses}</div>
              <div className="text-sm md:text-base text-gray-600">Losses</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-yellow-600 mb-2">{draws}</div>
              <div className="text-sm md:text-base text-gray-600">Draws</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">{totalGoalsFor}</div>
              <div className="text-sm md:text-base text-gray-600">Goals For</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg col-span-2 sm:col-span-3 md:col-span-1">
              <div className="text-2xl md:text-3xl font-bold text-gray-600 mb-2">{totalGoalsAgainst}</div>
              <div className="text-sm md:text-base text-gray-600">Goals Against</div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="py-6 md:py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2 md:gap-4">
            {['news', 'schedule', 'events'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-2 md:py-3 font-semibold rounded-lg transition-colors text-sm md:text-base ${
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
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* News Tab */}
          {activeTab === 'news' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Latest News</h2>
              {news.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">No news articles available yet.</div>
                </div>
              ) : (
                <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {news.map((article) => (
                    <Link
                      key={article.id}
                      href={`/team/news/${article.slug}`}
                      className="bg-gray-50 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 block cursor-pointer"
                    >
                      {article.featured_image && (
                        <div className="aspect-video bg-gray-300">
                          <Image
                            src={article.featured_image}
                            alt={article.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      )}
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg md:text-xl font-bold text-team-blue mb-3 line-clamp-2">{article.title}</h3>
                        {article.excerpt && (
                          <p className="text-gray-600 mb-4 text-sm md:text-base line-clamp-3">{article.excerpt}</p>
                        )}
                        <div className="flex justify-between items-center text-xs md:text-sm text-gray-500">
                          <span>{article.author || 'Team Staff'}</span>
                          <span>{parseAsLocalTime(article.publish_date!).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-4 text-team-blue font-medium text-sm">
                          Read more →
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Game Schedule & Results</h2>
              
              {/* GameChanger Widget */}
              <div className="mb-8 md:mb-12 bg-gray-50 rounded-lg p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <h3 className="text-lg md:text-xl font-semibold text-team-blue">Official Schedule</h3>
                  <a 
                    href="https://web.gc.com/teams/8Wt5HEmIzGY6?utm_source=Web&utm_campaign=team_share_link" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-team-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base font-medium"
                  >
                    View on GameChanger →
                  </a>
                </div>
                <div id="gc-schedule-widget-y5h5" style={{minHeight: '300px', border: '2px dashed #d1d5db', borderRadius: '4px'}}>
                  <div className="text-center text-gray-500 p-4">
                    <p>Loading GameChanger schedule...</p>
                    <p className="text-xs mt-2">If this doesn't load, please check the browser console for errors</p>
                  </div>
                </div>
                
                {/* Fallback message if widget doesn't load */}
                <div className="mt-4 hidden" id="gc-fallback-message">
                  <div className="text-center text-gray-500 p-4 bg-gray-50 rounded border">
                    <p>GameChanger widget is not displaying properly.</p>
                    <p className="text-sm mt-2">Please use the "View on GameChanger" button above to see the full schedule.</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Schedule powered by GameChanger. Click "View on GameChanger" for live scores, stats, and detailed game information.
                </p>
              </div>
              
              {schedule.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">No additional games found in our database.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg md:text-xl font-semibold text-team-blue mb-4">Additional Schedule Information</h3>
                  {schedule.map((game) => (
                    <div key={game.id} className="bg-gray-50 rounded-lg p-4 md:p-6 shadow-lg">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                            <h3 className="text-lg md:text-xl font-bold text-team-blue">
                              Ponca City United vs {game.opponent}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-semibold inline-block w-fit ${
                              game.status === 'completed' ? 'bg-gray-200 text-gray-800' :
                              game.status === 'in_progress' ? 'bg-green-200 text-green-800' :
                              game.status === 'cancelled' ? 'bg-red-200 text-red-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {game.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="text-gray-600 space-y-1 text-sm md:text-base">
                            <p><strong>Date:</strong> {parseAsLocalTime(game.game_date).toLocaleDateString()} at {parseAsLocalTime(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p><strong>Location:</strong> {game.location} {game.home_game ? '🏠' : '✈️'}</p>
                            <p><strong>Type:</strong> {game.game_type.toUpperCase()}</p>
                          </div>
                        </div>
                        
                        {game.status === 'completed' && 
                         game.our_score !== null && game.our_score !== undefined && 
                         game.opponent_score !== null && game.opponent_score !== undefined && (
                          <div className="mt-4 md:mt-0 text-center">
                            <div className="text-xl md:text-2xl font-bold">
                              <span className={game.our_score > game.opponent_score ? 'text-green-600' : 'text-red-600'}>
                                {game.our_score}
                              </span>
                              {' - '}
                              <span className={game.opponent_score > game.our_score ? 'text-green-600' : 'text-red-600'}>
                                {game.opponent_score}
                              </span>
                            </div>
                            <div className={`text-xs md:text-sm font-semibold ${
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
                          <p className="text-gray-700 text-sm md:text-base">{game.notes}</p>
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
              <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Upcoming Events</h2>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">No upcoming events scheduled.</div>
                </div>
              ) : (
                <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      )}
                      <div className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                            event.event_type === 'game' ? 'bg-green-200 text-green-800' :
                            event.event_type === 'tournament' ? 'bg-purple-200 text-purple-800' :
                            event.event_type === 'practice' ? 'bg-blue-200 text-blue-800' :
                            event.event_type === 'meeting' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {event.event_type.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-team-blue mb-3 line-clamp-2">{event.title}</h3>
                        {event.description && (
                          <p className="text-gray-600 mb-4 text-sm md:text-base line-clamp-3">{event.description}</p>
                        )}
                        <div className="space-y-2 text-xs md:text-sm text-gray-600">
                          <p><strong>Date:</strong> {parseAsLocalTime(event.event_date).toLocaleDateString()}</p>
                          <p><strong>Time:</strong> {parseAsLocalTime(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
      
      {/* GameChanger Widget Script */}
      <Script 
        src="https://widgets.gc.com/static/js/sdk.v1.js"
        strategy="afterInteractive"
        onLoad={initializeGameChangerWidget}
      />
    </>
  );
}