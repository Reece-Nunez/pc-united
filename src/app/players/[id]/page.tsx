'use client';

import { useParams } from 'next/navigation';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";

// Sample player data - in a real app this would come from a database
const players = [
  {
    id: 1,
    name: "Alex Johnson",
    jerseyNumber: 10,
    position: "Forward",
    birthYear: 2016,
    photo: "/logo.png",
    stats: {
      goals: 12,
      assists: 8,
      gamesPlayed: 15,
      yellowCards: 1,
      redCards: 0,
      saves: 0,
      cleanSheets: 0
    },
    highlights: [
      { id: 1, title: "Amazing Goal vs Thunder FC", date: "2024-03-15", type: "goal" },
      { id: 2, title: "Hat-trick Performance", date: "2024-02-28", type: "multiple" },
      { id: 3, title: "Winning Goal in Tournament Final", date: "2024-01-20", type: "goal" }
    ],
    description: "Dynamic forward with excellent ball control and finishing ability. Shows great promise with natural goal-scoring instinct.",
    strengths: ["Clinical finishing", "Ball control", "Speed", "Positioning"],
    areasToImprove: ["Passing accuracy", "Defensive work rate"],
    coachNotes: "Alex has shown tremendous improvement this season. Natural goal scorer with great instincts in the box."
  },
  {
    id: 2,
    name: "Sam Rodriguez",
    jerseyNumber: 7,
    position: "Midfielder",
    birthYear: 2017,
    photo: "/logo.png",
    stats: {
      goals: 5,
      assists: 12,
      gamesPlayed: 16,
      yellowCards: 0,
      redCards: 0,
      saves: 0,
      cleanSheets: 0
    },
    highlights: [
      { id: 1, title: "Perfect Through Ball Assist", date: "2024-03-10", type: "assist" },
      { id: 2, title: "Midfield Masterclass", date: "2024-02-15", type: "performance" }
    ],
    description: "Creative midfielder with great passing vision and work rate.",
    strengths: ["Vision", "Passing accuracy", "Work rate", "Team play"],
    areasToImprove: ["Shooting power", "Aerial ability"],
    coachNotes: "Sam is the engine of our midfield. Excellent decision-making and always puts the team first."
  },
  {
    id: 3,
    name: "Jordan Smith",
    jerseyNumber: 3,
    position: "Defender",
    birthYear: 2016,
    photo: "/logo.png",
    stats: {
      goals: 2,
      assists: 4,
      gamesPlayed: 14,
      yellowCards: 2,
      redCards: 0,
      saves: 0,
      cleanSheets: 6
    },
    highlights: [
      { id: 1, title: "Last-minute Goal Line Clearance", date: "2024-03-05", type: "defense" }
    ],
    description: "Solid defender with strong tackling and leadership qualities.",
    strengths: ["Tackling", "Leadership", "Aerial ability", "Communication"],
    areasToImprove: ["Pace", "Ball distribution"],
    coachNotes: "Jordan is a natural leader on the field. Solid defender who organizes the backline well."
  },
  {
    id: 4,
    name: "Casey Williams",
    jerseyNumber: 1,
    position: "Goalkeeper",
    birthYear: 2016,
    photo: "/logo.png",
    stats: {
      goals: 0,
      assists: 1,
      gamesPlayed: 12,
      yellowCards: 0,
      redCards: 0,
      saves: 45,
      cleanSheets: 7
    },
    highlights: [
      { id: 1, title: "Penalty Save in Final", date: "2024-03-20", type: "save" },
      { id: 2, title: "Double Save vs Lightning FC", date: "2024-02-18", type: "save" },
      { id: 3, title: "Clean Sheet Streak", date: "2024-01-15", type: "performance" },
      { id: 4, title: "Long Range Assist", date: "2024-01-08", type: "assist" }
    ],
    description: "Reliable goalkeeper with quick reflexes and great communication.",
    strengths: ["Reflexes", "Communication", "Distribution", "Positioning"],
    areasToImprove: ["Coming for crosses", "Footwork"],
    coachNotes: "Casey is incredibly reliable between the posts. Great shot-stopper with excellent distribution."
  },
  {
    id: 5,
    name: "Taylor Brown",
    jerseyNumber: 11,
    position: "Winger",
    birthYear: 2017,
    photo: "/logo.png",
    stats: {
      goals: 8,
      assists: 6,
      gamesPlayed: 13,
      yellowCards: 0,
      redCards: 0,
      saves: 0,
      cleanSheets: 0
    },
    highlights: [
      { id: 1, title: "Solo Run and Finish", date: "2024-03-12", type: "goal" },
      { id: 2, title: "Perfect Cross for Winning Goal", date: "2024-02-25", type: "assist" }
    ],
    description: "Speedy winger with excellent dribbling skills and crossing ability.",
    strengths: ["Pace", "Dribbling", "Crossing", "1v1 situations"],
    areasToImprove: ["Final ball", "Defensive tracking"],
    coachNotes: "Taylor brings excitement to our attack. Natural winger with great pace and skill on the ball."
  },
  {
    id: 6,
    name: "Riley Davis",
    jerseyNumber: 8,
    position: "Midfielder",
    birthYear: 2016,
    photo: "/logo.png",
    stats: {
      goals: 6,
      assists: 9,
      gamesPlayed: 15,
      yellowCards: 1,
      redCards: 0,
      saves: 0,
      cleanSheets: 0
    },
    highlights: [
      { id: 1, title: "Long Range Screamer", date: "2024-03-08", type: "goal" },
      { id: 2, title: "Box-to-Box Performance", date: "2024-02-20", type: "performance" },
      { id: 3, title: "Crucial Defensive Block", date: "2024-01-30", type: "defense" }
    ],
    description: "Versatile midfielder who can play both defensive and attacking roles.",
    strengths: ["Versatility", "Long shots", "Work rate", "Ball winning"],
    areasToImprove: ["Consistency", "Set piece delivery"],
    coachNotes: "Riley is our Swiss Army knife - can play anywhere in midfield and always gives 100%."
  }
];

export default function PlayerProfile() {
  const params = useParams();
  const playerId = parseInt(params.id as string);
  const player = players.find(p => p.id === playerId);

  if (!player) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Player Not Found</h1>
          <Link href="/players" className="text-team-red hover:underline">← Back to Players</Link>
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
                  {player.jerseyNumber}
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
                  <span className="font-semibold ml-2">{player.birthYear}</span>
                </div>
                <div>
                  <span className="text-blue-100">Games Played:</span>
                  <span className="font-semibold ml-2">{player.stats.gamesPlayed}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <Image
                  src={player.photo}
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
              <div className="text-3xl font-bold text-team-blue mb-2">{player.stats.goals}</div>
              <div className="text-gray-600">Goals</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">{player.stats.assists}</div>
              <div className="text-gray-600">Assists</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-lg">
              <div className="text-3xl font-bold text-team-blue mb-2">{player.stats.gamesPlayed}</div>
              <div className="text-gray-600">Games Played</div>
            </div>
            {player.position === 'Goalkeeper' ? (
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-3xl font-bold text-team-blue mb-2">{player.stats.saves}</div>
                <div className="text-gray-600">Saves</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-3xl font-bold text-team-blue mb-2">{player.highlights.length}</div>
                <div className="text-gray-600">Highlights</div>
              </div>
            )}
          </div>

          {player.position === 'Goalkeeper' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-2xl font-bold text-team-blue mb-2">{player.stats.cleanSheets}</div>
                <div className="text-gray-600">Clean Sheets</div>
              </div>
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-2xl font-bold text-team-blue mb-2">
                  {player.stats.gamesPlayed > 0 ? (player.stats.saves / player.stats.gamesPlayed).toFixed(1) : '0.0'}
                </div>
                <div className="text-gray-600">Saves per Game</div>
              </div>
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <div className="text-2xl font-bold text-team-blue mb-2">
                  {player.stats.gamesPlayed > 0 ? ((player.stats.cleanSheets / player.stats.gamesPlayed) * 100).toFixed(0) : '0'}%
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
            {player.highlights.map((highlight) => (
              <div key={highlight.id} className="bg-gray-50 rounded-lg p-6 shadow-lg">
                <div className="aspect-video bg-gray-300 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎥</div>
                    <div className="text-gray-600">Video Highlight</div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-team-blue mb-2">{highlight.title}</h3>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{new Date(highlight.date).toLocaleDateString()}</span>
                  <span className="bg-team-red text-white px-2 py-1 rounded text-xs">
                    {highlight.type.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
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
                {player.strengths.map((strength, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-team-red mr-3">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-team-blue mb-6">Areas to Improve</h3>
              <ul className="space-y-3">
                {player.areasToImprove.map((area, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-team-orange mr-3">→</span>
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-12 bg-white rounded-lg p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-team-blue mb-4">Coach's Notes</h3>
            <p className="text-gray-700 text-lg leading-relaxed">{player.coachNotes}</p>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}