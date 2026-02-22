'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ShareIcon, CheckIcon } from '@heroicons/react/24/outline';
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
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: player?.name || 'Player Profile', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
        <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="h-6 bg-white/20 rounded w-32 mb-6" />
                <div className="h-10 bg-white/20 rounded w-3/4 mb-4" />
                <div className="h-5 bg-white/20 rounded w-1/2 mb-6" />
                <div className="h-4 bg-white/20 rounded w-full mb-2" />
                <div className="h-4 bg-white/20 rounded w-5/6" />
              </div>
              <div className="flex justify-center">
                <div className="w-48 h-48 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow-lg">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>
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
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/players" className="inline-flex items-center gap-1.5 text-blue-100 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
              <ArrowLeftIcon className="w-4 h-4" /> Back to Roster
            </Link>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-blue-100 hover:text-white transition-colors text-sm md:text-base"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <ShareIcon className="w-4 h-4" />}
              {copied ? 'Link Copied!' : 'Share'}
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="flex items-center mb-4">
                <div className="bg-team-red text-white rounded-full w-14 h-14 flex items-center justify-center font-bold text-2xl mr-4 shrink-0">
                  {player.jersey_number}
                </div>
                <div>
                  <h1 className="text-3xl md:text-5xl font-bold mb-1">{player.name}</h1>
                  <p className="text-lg md:text-xl text-team-red font-semibold">{player.position}</p>
                </div>
              </div>
              <p className="text-base md:text-lg text-blue-100 mb-6">{player.description}</p>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <span className="text-blue-200 text-xs">Birth Year</span>
                  <span className="block font-semibold">{player.birth_year}</span>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <span className="text-blue-200 text-xs">Games Played</span>
                  <span className="block font-semibold">{player.player_stats?.[0]?.games_played || 0}</span>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <span className="text-blue-200 text-xs">Highlights</span>
                  <span className="block font-semibold">{allHighlights.length}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center order-1 md:order-2">
              <div className="relative w-36 h-36 md:w-52 md:h-52">
                <Image
                  src={player.photo_url || '/logo.png'}
                  alt={`${player.name} photo`}
                  fill
                  className="rounded-full object-cover border-4 border-white shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Season Statistics</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.goals || 0}</div>
              <div className="text-sm md:text-base text-gray-600">Goals</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.assists || 0}</div>
              <div className="text-sm md:text-base text-gray-600">Assists</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.games_played || 0}</div>
              <div className="text-sm md:text-base text-gray-600">Games Played</div>
            </div>
            {player.position === 'Goalkeeper' ? (
              <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
                <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.saves || 0}</div>
                <div className="text-sm md:text-base text-gray-600">Saves</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
                <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">{allHighlights.length}</div>
                <div className="text-sm md:text-base text-gray-600">Highlights</div>
              </div>
            )}
          </div>

          {/* Visual Stat Bars */}
          {player.position !== 'Goalkeeper' && (
            <div className="bg-white rounded-lg p-4 md:p-6 shadow-lg mb-8 md:mb-12">
              <h3 className="text-lg font-semibold text-team-blue mb-4">Performance Breakdown</h3>
              {(() => {
                const goals = player.player_stats?.[0]?.goals || 0;
                const assists = player.player_stats?.[0]?.assists || 0;
                const games = player.player_stats?.[0]?.games_played || 0;
                const maxVal = Math.max(goals, assists, games, 1);
                const bars = [
                  { label: 'Goals', value: goals, color: 'bg-team-red' },
                  { label: 'Assists', value: assists, color: 'bg-blue-500' },
                  { label: 'Games', value: games, color: 'bg-team-blue' },
                ];
                return bars.map((bar) => (
                  <div key={bar.label} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">{bar.label}</span>
                      <span className="font-bold text-gray-800">{bar.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`${bar.color} h-3 rounded-full transition-all duration-700`}
                        style={{ width: `${(bar.value / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {player.position === 'Goalkeeper' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
                <div className="text-xl md:text-2xl font-bold text-team-blue mb-2">{player.player_stats?.[0]?.clean_sheets || 0}</div>
                <div className="text-sm md:text-base text-gray-600">Clean Sheets</div>
              </div>
              <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
                <div className="text-xl md:text-2xl font-bold text-team-blue mb-2">
                  {(player.player_stats?.[0]?.games_played || 0) > 0 ?
                    ((player.player_stats?.[0]?.saves || 0) / (player.player_stats?.[0]?.games_played || 1)).toFixed(1) : '0.0'}
                </div>
                <div className="text-sm md:text-base text-gray-600">Saves per Game</div>
              </div>
              <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
                <div className="text-xl md:text-2xl font-bold text-team-blue mb-2">
                  {(player.player_stats?.[0]?.games_played || 0) > 0 ?
                    (((player.player_stats?.[0]?.clean_sheets || 0) / (player.player_stats?.[0]?.games_played || 1)) * 100).toFixed(0) : '0'}%
                </div>
                <div className="text-sm md:text-base text-gray-600">Clean Sheet %</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Game Highlights</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
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
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-team-blue mb-8 md:mb-12 text-center">Player Development</h2>
          
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