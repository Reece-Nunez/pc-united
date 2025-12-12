'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { getPlayers, getSchedule, getHighlights, Player, Schedule } from "@/lib/supabase";

interface PlayerWithStats extends Player {
  player_stats?: Array<{
    goals: number;
    assists: number;
    games_played: number;
    yellow_cards: number;
    red_cards: number;
    saves?: number;
    clean_sheets?: number;
  }>;
  highlights?: Array<any>;
}

interface HighlightData {
  id: number;
  assist_by?: string;
}

export default function PlayersClient() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [allHighlights, setAllHighlights] = useState<HighlightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>('All');

  useEffect(() => {
    async function fetchData() {
      try {
        const [playersResult, scheduleResult, highlightsResult] = await Promise.all([
          getPlayers(),
          getSchedule(),
          getHighlights()
        ]);

        if (playersResult.error) {
          setError(playersResult.error.message);
        } else if (playersResult.data) {
          setPlayers(playersResult.data);
        }

        if (scheduleResult.error) {
          console.error('Error fetching schedule:', scheduleResult.error);
        } else if (scheduleResult.data) {
          setSchedule(scheduleResult.data);
        }

        if (highlightsResult.data) {
          setAllHighlights(highlightsResult.data);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
        <h1 className="text-2xl md:text-4xl font-bold text-team-blue mb-4">Loading Players...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl md:text-4xl font-bold text-team-blue mb-4">Error Loading Players</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <p className="text-sm text-gray-500">Please ensure Supabase is properly configured.</p>
      </div>
    );
  }

  // Get unique positions for filter
  const positions = ['All', ...Array.from(new Set(players.map(player => player.position)))];
  
  // Filter players by position
  const filteredPlayers = selectedPosition === 'All' 
    ? players 
    : players.filter(player => player.position === selectedPosition);

  // Calculate actual completed games from schedule
  const completedGames = schedule.filter(game => game.status === 'completed').length;

  return (
    <>
      {/* Team Stats Overview */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">{players.length}</div>
              <div className="text-sm md:text-base text-gray-600">Active Players</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">
                {players.reduce((sum, player) => sum + (player.player_stats?.[0]?.goals || 0), 0)}
              </div>
              <div className="text-sm md:text-base text-gray-600">Total Goals</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">
                {players.reduce((sum, player) => sum + (player.player_stats?.[0]?.assists || 0), 0)}
              </div>
              <div className="text-sm md:text-base text-gray-600">Total Assists</div>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
              <div className="text-2xl md:text-3xl font-bold text-team-blue mb-2">
                {completedGames}
              </div>
              <div className="text-sm md:text-base text-gray-600">Games Played</div>
            </div>
          </div>
        </div>
      </section>

      {/* Position Filter */}
      <section className="py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2 md:gap-4">
            {positions.map((position) => (
              <button
                key={position}
                onClick={() => setSelectedPosition(position)}
                className={`px-4 py-2 rounded-full text-sm md:text-base font-semibold transition-colors ${
                  selectedPosition === position
                    ? 'bg-team-blue text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {position}
              </button>
            ))}
          </div>
          <p className="text-center text-gray-600 mt-4 text-sm md:text-base">
            Showing {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
            {selectedPosition !== 'All' && ` in ${selectedPosition}`}
          </p>
        </div>
      </section>

      {/* Players Grid */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl md:text-8xl text-gray-300 mb-4">⚽</div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-600 mb-2">No Players Found</h3>
              <p className="text-gray-500">
                {selectedPosition === 'All' 
                  ? 'No players have been added yet.' 
                  : `No players found for position: ${selectedPosition}`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {filteredPlayers.map((player) => {
                const stats = player.player_stats?.[0];
                const scoredHighlights = player.highlights?.length || 0;
                const assistHighlights = allHighlights.filter(h => h.assist_by === player.name).length;
                const highlightsCount = scoredHighlights + assistHighlights;

                return (
                  <Link 
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="group"
                  >
                    <div className="bg-gray-50 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2">
                      <div className="aspect-square bg-gray-300 relative overflow-hidden">
                        <Image
                          src={player.photo_url || '/logo.png'}
                          alt={`${player.name} - ${player.position}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        />
                        <div className="absolute top-2 left-2 bg-team-blue text-white rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-bold text-lg md:text-xl">
                          {player.jersey_number}
                        </div>
                        {highlightsCount > 0 && (
                          <div className="absolute top-2 right-2 bg-team-red text-white rounded-full px-2 py-1 text-xs font-semibold">
                            {highlightsCount} highlight{highlightsCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg md:text-xl font-bold text-team-blue mb-1 line-clamp-1">{player.name}</h3>
                        <p className="text-gray-600 text-sm md:text-base mb-2">{player.position}</p>
                        
                        {/* Player Stats */}
                        {stats && (
                          <div className="grid grid-cols-3 gap-2 text-center text-xs md:text-sm">
                            <div>
                              <div className="font-bold text-team-blue">{stats.goals}</div>
                              <div className="text-gray-600">Goals</div>
                            </div>
                            <div>
                              <div className="font-bold text-team-blue">{stats.assists}</div>
                              <div className="text-gray-600">Assists</div>
                            </div>
                            <div>
                              <div className="font-bold text-team-blue">{stats.games_played}</div>
                              <div className="text-gray-600">Games</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 text-center">
                          <span className="text-team-blue text-sm font-semibold group-hover:underline">
                            View Profile →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}