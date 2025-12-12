'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import { getPlayer, getPlayerAssists, Player } from "@/lib/supabase";

interface HighlightItem {
  id: number;
  title: string;
  highlight_date: string;
  type: string;
  video_url?: string;
  isAssist?: boolean;
}

interface PlayerWithDetails extends Player {
  player_stats?: Array<{
    goals: number;
    assists: number;
    games_played: number;
    yellow_cards: number;
    red_cards: number;
    saves?: number;
    clean_sheets?: number;
  }>;
  highlights?: Array<{
    id: number;
    title: string;
    highlight_date: string;
    type: string;
    video_url?: string;
  }>;
}
export default function PlayerProfile() {
  const params = useParams();
  const playerId = parseInt(params.id as string);
  const [player, setPlayer] = useState<PlayerWithDetails | null>(null);
  const [allHighlights, setAllHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoPreviews, setVideoPreviews] = useState<{[key: number]: string}>({});

  useEffect(() => {
    async function fetchPlayer() {
      if (!playerId) {
        setError('Invalid player ID');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await getPlayer(playerId);
        if (error) {
          setError(error.message);
        } else if (data) {
          setPlayer(data);

          // Fetch assists for this player
          const { data: assistsData } = await getPlayerAssists(data.name);

          // Combine scored highlights and assists
          const scoredHighlights: HighlightItem[] = (data.highlights || []).map((h: { id: number; title: string; highlight_date: string; type: string; video_url?: string }) => ({
            ...h,
            isAssist: false
          }));

          const assistHighlights: HighlightItem[] = (assistsData || [])
            .filter((a: { id: number }) => !scoredHighlights.some(s => s.id === a.id)) // Avoid duplicates
            .map((h: { id: number; title: string; highlight_date: string; type: string; video_url?: string }) => ({
              ...h,
              isAssist: true
            }));

          // Combine and sort by date
          const combined = [...scoredHighlights, ...assistHighlights].sort(
            (a, b) => new Date(b.highlight_date).getTime() - new Date(a.highlight_date).getTime()
          );

          setAllHighlights(combined);
        } else {
          setError('Player not found');
        }
      } catch (err) {
        setError('Failed to fetch player');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayer();
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Loading Player...</h1>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Player Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/players" className="text-team-red hover:underline cursor-pointer">← Back to Players</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Player Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <Link href="/players" className="text-blue-100 hover:text-white mr-4 cursor-pointer">
              ← Back to Players
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-team-red text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mr-4">
                  {player.jersey_number}
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">{player.name}</h1>
                  <p className="text-xl text-team-red font-semibold">{player.position}</p>
                </div>
              </div>
              <p className="text-lg text-blue-100 mb-6">{player.description}</p>
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="text-blue-100">Birth Year:</span>
                  <span className="font-semibold ml-2">{player.birth_year}</span>
                </div>
                <div>
                  <span className="text-blue-100">Games Played:</span>
                  <span className="font-semibold ml-2">{player.player_stats?.[0]?.games_played || 0}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <Image
                  src={player.photo_url || '/logo.png'}
                  alt={`${player.name} photo`}
                  fill
                  className="rounded-full object-cover border-4 border-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-team-blue mb-12 text-center">Season Statistics</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.goals || 0}</div>
              <div className="text-gray-600">Goals</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.assists || 0}</div>
              <div className="text-gray-600">Assists</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.games_played || 0}</div>
              <div className="text-gray-600">Games Played</div>
            </div>
            {player.position === 'Goalkeeper' ? (
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.saves || 0}</div>
                <div className="text-gray-600">Saves</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-3xl font-bold text-team-blue mb-2">{player.highlights?.length || 0}</div>
                <div className="text-gray-600">Highlights</div>
              </div>
            )}
          </div>

          {player.position === 'Goalkeeper' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-2xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.clean_sheets || 0}</div>
                <div className="text-gray-600">Clean Sheets</div>
              </div>
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-2xl font-bold text-team-blue mb-2">
                  {(player.player_stats?.[0]?.games_played || 0) > 0 ? 
                    ((player.player_stats?.[0]?.saves || 0) / (player.player_stats?.[0]?.games_played || 1)).toFixed(1) : '0.0'}
                </div>
                <div className="text-gray-600">Saves per Game</div>
              </div>
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-2xl font-bold text-team-blue mb-2">
                  {(player.player_stats?.[0]?.games_played || 0) > 0 ? 
                    (((player.player_stats?.[0]?.clean_sheets || 0) / (player.player_stats?.[0]?.games_played || 1)) * 100).toFixed(0) : '0'}%
                </div>
                <div className="text-gray-600">Clean Sheet %</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-team-blue mb-12 text-center">Game Highlights</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allHighlights.length > 0 ? allHighlights.map((highlight) => {
              // Determine video type based on URL
              const getVideoEmbed = (url: string) => {
                // YouTube
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                  let videoId = '';
                  if (url.includes('youtube.com/watch')) {
                    videoId = new URL(url).searchParams.get('v') || '';
                  } else if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
                  } else if (url.includes('youtube.com/embed/')) {
                    videoId = url.split('embed/')[1]?.split('?')[0] || '';
                  }
                  if (videoId) {
                    return (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="w-full h-full rounded"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                }

                // GameChanger - link to external site
                if (url.includes('gc.com') || url.includes('gamechanger.io')) {
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 transition-all"
                    >
                      <div className="text-center text-white">
                        <div className="text-4xl mb-2">🎮</div>
                        <div className="font-semibold">Watch on GameChanger</div>
                        <div className="text-xs mt-1 opacity-80">Click to open</div>
                      </div>
                    </a>
                  );
                }

                // Vimeo
                if (url.includes('vimeo.com')) {
                  const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0] || '';
                  if (vimeoId) {
                    return (
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}`}
                        className="w-full h-full rounded"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                }

                // Direct video file (S3, etc.)
                if (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('s3.') || url.includes('amazonaws.com')) {
                  return (
                    <video
                      src={url}
                      className="w-full h-full rounded object-cover"
                      controls
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  );
                }

                // Unknown URL - show as clickable link
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center bg-gradient-to-br from-team-blue to-blue-700 hover:from-blue-600 hover:to-blue-800 transition-all"
                  >
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">🎥</div>
                      <div className="font-semibold">Watch Video</div>
                      <div className="text-xs mt-1 opacity-80">Click to open</div>
                    </div>
                  </a>
                );
              };

              return (
              <div key={highlight.id} className="bg-gray-50 rounded-lg p-6 shadow-lg">
                <div className="aspect-video bg-gray-300 rounded-lg mb-4 overflow-hidden">
                  {highlight.video_url ? (
                    getVideoEmbed(highlight.video_url)
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎥</div>
                        <div className="text-gray-600">Video Highlight</div>
                        <div className="text-xs text-gray-500 mt-1">No video uploaded</div>
                      </div>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-team-blue mb-2">{highlight.title}</h3>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{new Date(highlight.highlight_date).toLocaleDateString()}</span>
                  <span className={`px-2 py-1 rounded text-xs text-white ${highlight.isAssist ? 'bg-green-600' : 'bg-team-red'}`}>
                    {highlight.isAssist ? 'ASSIST' : highlight.type.toUpperCase()}
                  </span>
                </div>
              </div>
            );
            }) : (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500">No highlights available yet.</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Player Development Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-team-blue mb-12 text-center">Player Development</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-6">Strengths</h3>
              <ul className="space-y-3">
                {player.strengths && player.strengths.length > 0 ? player.strengths.map((strength, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-team-red mr-3">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                )) : (
                  <li className="text-gray-500">No strengths recorded yet.</li>
                )}
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-6">Areas to Improve</h3>
              <ul className="space-y-3">
                {player.areas_to_improve && player.areas_to_improve.length > 0 ? player.areas_to_improve.map((area, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-team-orange mr-3">→</span>
                    <span className="text-gray-700">{area}</span>
                  </li>
                )) : (
                  <li className="text-gray-500">No areas for improvement recorded yet.</li>
                )}
              </ul>
            </div>
          </div>
          
          {player.coach_notes && (
            <div className="mt-12 bg-white rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-4">Coach's Notes</h3>
              <p className="text-gray-700 text-lg leading-relaxed">{player.coach_notes}</p>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
}