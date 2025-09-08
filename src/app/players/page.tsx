'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import { getPlayers, Player } from "@/lib/supabase";

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
export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const { data, error } = await getPlayers();
        if (error) {
          setError(error.message);
        } else if (data) {
          setPlayers(data);
        }
      } catch (err) {
        setError('Failed to fetch players');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Loading Players...</h1>
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
          <h1 className="text-4xl font-bold text-team-blue mb-4">Error Loading Players</h1>
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
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Our <span className="text-team-red">Players</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Meet the talented young athletes of our U10 Developmental team - building their soccer careers one game at a time.
            </p>
          </div>
        </div>
      </section>

      {/* Team Stats Overview */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">{players.length}</div>
              <div className="text-gray-600">Active Players</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">
                {players.reduce((sum, player) => sum + (player.player_stats?.[0]?.goals || 0), 0)}
              </div>
              <div className="text-gray-600">Total Goals</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">
                {players.reduce((sum, player) => sum + (player.player_stats?.[0]?.assists || 0), 0)}
              </div>
              <div className="text-gray-600">Total Assists</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">
                {players.reduce((sum, player) => sum + (player.highlights?.length || 0), 0)}
              </div>
              <div className="text-gray-600">Video Highlights</div>
            </div>
          </div>
        </div>
      </section>

      {/* Player Profiles Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-team-blue mb-4">Player Profiles</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Click on any player to view their detailed profile, stats, and highlight videos.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {players.map((player) => (
              <Link key={player.id} href={`/players/${player.id}`} className="cursor-pointer">
                <div className="bg-gray-50 rounded-lg p-6 shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-105">
                  <div className="text-center mb-6">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <Image
                        src={player.photo_url || '/logo.png'}
                        alt={`${player.name} photo`}
                        fill
                        className="rounded-full object-cover border-4 border-team-blue"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-team-red text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                        {player.jersey_number}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-team-blue mb-1">{player.name}</h3>
                    <p className="text-team-red font-semibold mb-1">{player.position}</p>
                    <p className="text-sm text-gray-500">Born {player.birth_year}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">{player.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="bg-white rounded p-3 text-center">
                      <div className="font-bold text-team-blue">{player.player_stats?.[0]?.goals || 0}</div>
                      <div className="text-gray-600">Goals</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="font-bold text-team-blue">{player.player_stats?.[0]?.assists || 0}</div>
                      <div className="text-gray-600">Assists</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{player.player_stats?.[0]?.games_played || 0} games played</span>
                    <span className="text-team-red font-semibold">{player.highlights?.length || 0} highlights</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-team-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Your Soccer Journey</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Want to see your child featured here? Join our team and start building their soccer career with us!
          </p>
          <Link 
            href="/register" 
            className="bg-team-red hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition duration-300 transform hover:scale-105 cursor-pointer"
          >
            Join Our Team
          </Link>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}